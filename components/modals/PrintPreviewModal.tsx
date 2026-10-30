import React from 'react';
import { Printer, X } from 'lucide-react';

interface PrintPreviewModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Pratonton dokumen cetakan di dalam SPA (bukan tab baharu) + butang cetak. */
export default function PrintPreviewModal({
  title,
  subtitle,
  onClose,
  children,
}: PrintPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="print-modal-shell bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        <div className="no-print px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5 text-amber-400" /> Cetak
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
            >
              <X className="h-3.5 w-3.5" /> Tutup
            </button>
          </div>
        </div>

        <div className="print-modal-body overflow-auto flex-1 bg-slate-100 p-3 sm:p-5">
          <div className="mx-auto max-w-[210mm] bg-white shadow-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
