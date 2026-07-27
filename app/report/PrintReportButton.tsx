'use client';

import { Printer } from 'lucide-react';

/** زر طباعة التقرير — يتيح حفظه كملف PDF من نافذة الطباعة */
export function PrintReportButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/25 print:hidden"
        >
            <Printer size={18} />
            طباعة / حفظ PDF
        </button>
    );
}
