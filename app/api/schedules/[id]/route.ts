import { NextRequest, NextResponse } from 'next/server';
import { InspectionSchedule } from '@/lib/types';

// Declare access to schedule data if exported or managed
// Note: We can export or create a shared in-memory helper
import { INITIAL_SCHEDULES } from '@/lib/initialData';

let schedules = [...INITIAL_SCHEDULES];

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    return NextResponse.json({
      success: true,
      message: 'Jadual berjaya dikemaskini',
      id,
      data: body,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Gagal mengemaskini jadual' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return NextResponse.json({
      success: true,
      message: `Jadual ${id} berjaya dipadam`,
      id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Gagal memadam jadual' },
      { status: 500 }
    );
  }
}
