import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_SCHEDULES, INITIAL_AUDIT_LOGS } from '@/lib/initialData';
import { InspectionSchedule, PbacAuditLog } from '@/lib/types';

// In-memory data store for the runtime session
let schedulesData: InspectionSchedule[] = [...INITIAL_SCHEDULES];
let auditLogs: PbacAuditLog[] = [...INITIAL_AUDIT_LOGS];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dept = searchParams.get('dept');
  const status = searchParams.get('status');

  let results = [...schedulesData];
  if (dept && dept !== 'SEMUA') {
    results = results.filter((s) => s.jabatan === dept);
  }
  if (status && status !== 'SEMUA') {
    results = results.filter((s) => s.status === status);
  }

  return NextResponse.json({
    success: true,
    data: results,
    total: results.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.lokasi || !body.jabatan || !body.tarikhMula || !body.tarikhTamat) {
      return NextResponse.json(
        { success: false, message: 'Maklumat wajib tidak lengkap' },
        { status: 400 }
      );
    }

    const newId = body.id || `JAD-2026-${body.jabatan}-${Date.now().toString().slice(-4)}`;
    const newSchedule: InspectionSchedule = {
      id: newId,
      kod: body.kod || `JAD/${body.jabatan}/2026/${(schedulesData.length + 1).toString().padStart(2, '0')}`,
      jabatan: body.jabatan,
      lokasi: body.lokasi,
      kategori: body.kategori || 'Semua (Harta Modal & Aset Bernilai Rendah)',
      kuantiti: Number(body.kuantiti) || 1,
      tarikhMula: body.tarikhMula,
      tarikhTamat: body.tarikhTamat,
      pemeriksa1: body.pemeriksa1 || '',
      pemeriksa1Email: body.pemeriksa1Email || '',
      pemeriksa2: body.pemeriksa2 || '',
      pemeriksa2Email: body.pemeriksa2Email || '',
      penjaga: body.penjaga || '',
      status: body.status || 'Belum Mula',
      catatan: body.catatan || '',
      createdBy: body.createdBy || 'penyelaras@poliku.edu.my',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    schedulesData.unshift(newSchedule);

    return NextResponse.json(
      {
        success: true,
        message: 'Jadual pemeriksaan berjaya didaftarkan',
        data: newSchedule,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Gagal memproses data jadual' },
      { status: 500 }
    );
  }
}
