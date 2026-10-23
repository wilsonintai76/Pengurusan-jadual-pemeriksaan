'use client';

import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { InspectionSchedule } from '@/lib/types';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CalendarX, 
  Wrench, 
  Recycle, 
  Boxes,
  Building
} from 'lucide-react';

interface ChartProps {
  schedules: InspectionSchedule[];
}

// ==================== 1. D3 STATUS DONUT CHART ====================
export function D3StatusDonutChart({ schedules }: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    let selesai = 0;
    let proses = 0;
    let belum = 0;
    let overdue = 0;

    const today = new Date('2026-10-23');

    schedules.forEach((s) => {
      if (s.status === 'Selesai') {
        selesai++;
      } else if (s.status === 'Tertangguh') {
        overdue++;
      } else {
        const isPastDue = new Date(s.tarikhTamat) < today;
        if (isPastDue) {
          overdue++;
        } else if (s.status === 'Sedang Dijalankan') {
          proses++;
        } else {
          belum++;
        }
      }
    });

    return [
      { label: 'Selesai 100%', count: selesai, color: '#10b981', hoverColor: '#059669', id: 'selesai' },
      { label: 'Sedang Dijalankan', count: proses, color: '#f59e0b', hoverColor: '#d97706', id: 'proses' },
      { label: 'Belum Mula', count: belum, color: '#0284c7', hoverColor: '#0369a1', id: 'belum' },
      { label: 'Tugasan Lewat/Tertangguh', count: overdue, color: '#f43f5e', hoverColor: '#e11d48', id: 'overdue' },
    ];
  }, [schedules]);

  const total = useMemo(() => data.reduce((acc, d) => acc + d.count, 0), [data]);
  const selesaiCount = data.find((d) => d.id === 'selesai')?.count || 0;
  const selesaiPercent = total > 0 ? Math.round((selesaiCount / total) * 100) : 0;

  // D3 Pie & Arc Calculations
  const width = 240;
  const height = 240;
  const radius = Math.min(width, height) / 2;
  const innerRadius = radius * 0.68;

  const pie = useMemo(() => {
    return d3
      .pie<(typeof data)[0]>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.03);
  }, []);

  const arcGen = useMemo(() => {
    return d3
      .arc<d3.PieArcDatum<(typeof data)[0]>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 10)
      .cornerRadius(4);
  }, [innerRadius, radius]);

  const arcHoverGen = useMemo(() => {
    return d3
      .arc<d3.PieArcDatum<(typeof data)[0]>>()
      .innerRadius(innerRadius - 4)
      .outerRadius(radius - 4)
      .cornerRadius(5);
  }, [innerRadius, radius]);

  const arcs = useMemo(() => pie(data), [pie, data]);

  const activeSegment = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">
            Status Takwim & Pemeriksaan
          </h4>
          <p className="text-[11px] text-slate-500">
            D3 Donut: Nisbah pencapaian sasaran tahunan
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
          {selesaiPercent}% Selesai
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex items-center justify-center my-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-48 h-48 overflow-visible select-none"
        >
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {arcs.map((arc, i) => {
              const isHovered = hoveredIndex === i;
              const pathD = isHovered ? arcHoverGen(arc) : arcGen(arc);
              if (!pathD || arc.data.count === 0) return null;

              return (
                <path
                  key={i}
                  d={pathD}
                  fill={isHovered ? arc.data.hoverColor : arc.data.color}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="transition-all duration-200 cursor-pointer"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            })}
          </g>
        </svg>

        {/* Center Donut Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeSegment ? (
            <div className="animate-fade-in space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate max-w-[120px]">
                {activeSegment.label}
              </span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                {activeSegment.count}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {total > 0 ? Math.round((activeSegment.count / total) * 100) : 0}% daripada lokasi
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Pencapaian
              </span>
              <span className="text-3xl font-extrabold text-emerald-600 font-mono block tabular-nums">
                {selesaiPercent}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {selesaiCount} / {total} Makmal
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
        {data.map((item, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition ${
              hoveredIndex === idx ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600 truncate text-[11px] font-medium">
                {item.label}
              </span>
            </div>
            <span className="font-mono font-bold text-slate-900 text-xs shrink-0 pl-1">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 2. D3 DEPARTMENT PROGRESS BAR CHART ====================
export function D3DepartmentBarChart({ schedules }: ChartProps) {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  const deptData = useMemo(() => {
    const today = new Date('2026-10-23');
    const map: Record<
      string,
      { dept: string; totalAssets: number; selesai: number; proses: number; overdue: number; totalRooms: number }
    > = {};

    schedules.forEach((s) => {
      if (!map[s.jabatan]) {
        map[s.jabatan] = {
          dept: s.jabatan,
          totalAssets: 0,
          selesai: 0,
          proses: 0,
          overdue: 0,
          totalRooms: 0,
        };
      }
      map[s.jabatan].totalAssets += s.kuantiti || 0;
      map[s.jabatan].totalRooms += 1;

      if (s.status === 'Selesai') {
        map[s.jabatan].selesai += 1;
      } else if (s.status === 'Tertangguh') {
        map[s.jabatan].overdue += 1;
      } else {
        const isPastDue = new Date(s.tarikhTamat) < today;
        if (isPastDue) {
          map[s.jabatan].overdue += 1;
        } else {
          map[s.jabatan].proses += 1;
        }
      }
    });

    return Object.values(map)
      .sort((a, b) => b.totalAssets - a.totalAssets)
      .slice(0, 6); // Top 6 departments for clarity
  }, [schedules]);

  // Dimensions
  const width = 420;
  const height = 230;
  const margin = { top: 20, right: 30, bottom: 25, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const yScale = useMemo(() => {
    return d3
      .scaleBand()
      .domain(deptData.map((d) => d.dept))
      .range([0, innerHeight])
      .padding(0.28);
  }, [deptData, innerHeight]);

  const maxRooms = useMemo(() => {
    const maxVal = d3.max(deptData, (d) => d.totalRooms) || 1;
    return Math.max(maxVal, 4);
  }, [deptData]);

  const xScale = useMemo(() => {
    return d3.scaleLinear().domain([0, maxRooms]).range([0, innerWidth]);
  }, [maxRooms, innerWidth]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">
            Kemajuan Mengikut Jabatan
          </h4>
          <p className="text-[11px] text-slate-500">
            D3 Bar: Lokasi selesai vs belum selesai vs lewat
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Selesai
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <span className="w-2 h-2 rounded-sm bg-amber-500" /> Proses
          </span>
          <span className="flex items-center gap-1 text-rose-700">
            <span className="w-2 h-2 rounded-sm bg-rose-500" /> Lewat
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto my-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 select-none">
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {xScale.ticks(4).map((tick) => (
              <line
                key={tick}
                x1={xScale(tick)}
                x2={xScale(tick)}
                y1={0}
                y2={innerHeight}
                stroke="#f1f5f9"
                strokeDasharray="2,2"
              />
            ))}

            {/* Department Bars */}
            {deptData.map((d) => {
              const y = yScale(d.dept) || 0;
              const barHeight = yScale.bandwidth();
              const isHovered = hoveredDept === d.dept;

              const selesaiWidth = xScale(d.selesai);
              const prosesWidth = xScale(d.proses);
              const overdueWidth = xScale(d.overdue);

              return (
                <g
                  key={d.dept}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredDept(d.dept)}
                  onMouseLeave={() => setHoveredDept(null)}
                >
                  {/* Department Label on Y-axis */}
                  <text
                    x={-8}
                    y={y + barHeight / 2 + 4}
                    textAnchor="end"
                    className={`text-[11px] font-mono font-bold transition-colors ${
                      isHovered ? 'fill-slate-900 font-extrabold' : 'fill-slate-600'
                    }`}
                  >
                    {d.dept}
                  </text>

                  {/* Background Track */}
                  <rect
                    x={0}
                    y={y}
                    width={innerWidth}
                    height={barHeight}
                    fill="#f8fafc"
                    rx={3}
                  />

                  {/* Selesai Segment (Emerald) */}
                  {d.selesai > 0 && (
                    <rect
                      x={0}
                      y={y}
                      width={selesaiWidth}
                      height={barHeight}
                      fill="#10b981"
                      rx={3}
                    />
                  )}

                  {/* Proses Segment (Amber) */}
                  {d.proses > 0 && (
                    <rect
                      x={selesaiWidth}
                      y={y}
                      width={prosesWidth}
                      height={barHeight}
                      fill="#f59e0b"
                      rx={d.selesai === 0 ? 3 : 0}
                    />
                  )}

                  {/* Overdue Segment (Rose) */}
                  {d.overdue > 0 && (
                    <rect
                      x={selesaiWidth + prosesWidth}
                      y={y}
                      width={overdueWidth}
                      height={barHeight}
                      fill="#f43f5e"
                      rx={d.selesai === 0 && d.proses === 0 ? 3 : 0}
                    />
                  )}

                  {/* Total Count Label at End */}
                  <text
                    x={selesaiWidth + prosesWidth + overdueWidth + 6}
                    y={y + barHeight / 2 + 3.5}
                    textAnchor="start"
                    className="text-[10px] font-mono font-bold fill-slate-700"
                  >
                    {d.totalRooms}
                  </text>
                </g>
              );
            })}

            {/* X-axis tick labels */}
            {xScale.ticks(4).map((tick) => (
              <text
                key={tick}
                x={xScale(tick)}
                y={innerHeight + 16}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-400"
              >
                {tick}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {/* Tooltip / Active Info footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        {hoveredDept ? (
          (() => {
            const cur = deptData.find((x) => x.dept === hoveredDept);
            return (
              <div className="flex items-center gap-3 w-full justify-between animate-fade-in font-mono text-[11px]">
                <span className="font-bold text-slate-900">{cur?.dept}:</span>
                <span className="text-emerald-700">{cur?.selesai} Selesai</span>
                <span className="text-amber-700">{cur?.proses} Proses</span>
                <span className="text-rose-700">{cur?.overdue} Lewat</span>
                <span className="text-slate-600 font-bold">{cur?.totalAssets} Unit Aset</span>
              </div>
            );
          })()
        ) : (
          <span className="text-[11px] text-slate-500 italic">
            Sentuh atau halakan kursor pada bar untuk melihat butiran lengkap jabatan.
          </span>
        )}
      </div>
    </div>
  );
}

// ==================== 3. D3 ASSET HEALTH & COMPLIANCE METER ====================
export function D3AssetHealthChart({ schedules }: ChartProps) {
  const [hoveredCondition, setHoveredCondition] = useState<string | null>(null);

  const { totalAssets, baik, rosak, usang, hilang, belumPeriksa } = useMemo(() => {
    let tot = 0;
    let b = 0;
    let r = 0;
    let u = 0;
    let h = 0;

    schedules.forEach((s) => {
      tot += s.kuantiti || 0;
      if (s.laporanPraJkpak) {
        b += s.laporanPraJkpak.baik || 0;
        r += s.laporanPraJkpak.rosak || 0;
        u += s.laporanPraJkpak.usang || 0;
        h += s.laporanPraJkpak.hilang || 0;
      }
    });

    const checkedTotal = b + r + u + h;
    const belum = Math.max(0, tot - checkedTotal);

    return {
      totalAssets: tot,
      baik: b,
      rosak: r,
      usang: u,
      hilang: h,
      belumPeriksa: belum,
    };
  }, [schedules]);

  const conditionMetrics = [
    {
      id: 'baik',
      name: 'Berkeadaan Baik',
      units: baik,
      color: '#10b981',
      bgColor: 'bg-emerald-500',
      badge: 'Boleh Guna',
      desc: 'Memenuhi fungsi PdP & pejabat',
    },
    {
      id: 'rosak',
      name: 'Perlu Pembaikan (LO)',
      units: rosak,
      color: '#f59e0b',
      bgColor: 'bg-amber-500',
      badge: 'Ada Aduan & LO',
      desc: 'Menunggu kerja senggaraan',
    },
    {
      id: 'usang',
      name: 'Syor Pelupusan (Usang)',
      units: usang,
      color: '#f97316',
      bgColor: 'bg-orange-500',
      badge: 'KEW.PA-19',
      desc: 'Teknologi lapuk / kos tinggi',
    },
    {
      id: 'hilang',
      name: 'Tidak Dijumpai (Hilang)',
      units: hilang,
      color: '#ef4444',
      bgColor: 'bg-rose-500',
      badge: 'Tindakan Kehilangan',
      desc: 'Wajib siasatan audit',
    },
    {
      id: 'belum',
      name: 'Belum Diperiksa (Jadual)',
      units: belumPeriksa,
      color: '#94a3b8',
      bgColor: 'bg-slate-400',
      badge: 'Dalam Takwim',
      desc: 'Menunggu tarikh lawatan fizikal',
    },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">
            Status Keadaan Fizikal Aset Berdaftar
          </h4>
          <p className="text-[11px] text-slate-500">
            D3 Gauge: Pecahan status kesihatan & integriti aset alih POLIKU
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-slate-500">Jumlah Aset:</span>
          <strong className="text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            {totalAssets} unit
          </strong>
        </div>
      </div>

      {/* Stacked Proportional Distribution Bar */}
      <div className="space-y-1.5">
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {conditionMetrics.map((c) => {
            if (c.units === 0 || totalAssets === 0) return null;
            const pct = (c.units / totalAssets) * 100;
            const isHovered = hoveredCondition === c.id;

            return (
              <div
                key={c.id}
                onMouseEnter={() => setHoveredCondition(c.id)}
                onMouseLeave={() => setHoveredCondition(null)}
                style={{ width: `${pct}%`, backgroundColor: c.color }}
                className={`h-full transition-all duration-150 cursor-pointer ${
                  isHovered ? 'brightness-110 ring-2 ring-white z-10' : ''
                }`}
                title={`${c.name}: ${c.units} unit (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Grid of 5 Metric Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
        {conditionMetrics.map((m) => {
          const pct = totalAssets > 0 ? Math.round((m.units / totalAssets) * 100) : 0;
          const isHovered = hoveredCondition === m.id;

          return (
            <div
              key={m.id}
              onMouseEnter={() => setHoveredCondition(m.id)}
              onMouseLeave={() => setHoveredCondition(null)}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                isHovered
                  ? 'border-slate-400 bg-slate-50 shadow-2xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${m.bgColor}`} />
                  <span className="font-bold text-slate-700 text-[11px] truncate">
                    {m.name.split('(')[0]}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-mono font-extrabold text-slate-900 tabular-nums">
                    {m.units}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({pct}%)
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-2 truncate text-center font-mono">
                {m.badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
