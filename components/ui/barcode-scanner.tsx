'use client';

import * as React from 'react';
import { Camera, CheckCircle2, X } from 'lucide-react';
import { AppModal } from '@/components/ui/app-modal';

type BarcodeScannerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
    title?: string;
    /** true = يستمر بالمسح بعد كل قراءة (لجمع عدة منتجات)، false = يغلق بعد أول قراءة */
    continuous?: boolean;
};

const SCANNER_ELEMENT_ID = 'barcode-scanner-viewport';

/** صفارة قصيرة عند نجاح القراءة */
function playBeep() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 880;
        gain.gain.value = 0.15;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.12);
        oscillator.onended = () => ctx.close();
    } catch {
        // لا مشكلة إن تعذر الصوت
    }
}

/**
 * ماسح باركود بكاميرا الجهاز (جوال/لابتوب) عبر مكتبة html5-qrcode
 * يتطلب HTTPS أو localhost للوصول للكاميرا
 */
export function BarcodeScannerModal({ isOpen, onClose, onScan, title = 'مسح الباركود بالكاميرا', continuous = false }: BarcodeScannerModalProps) {
    const [error, setError] = React.useState<string | null>(null);
    const [lastCode, setLastCode] = React.useState<string | null>(null);
    const [justScanned, setJustScanned] = React.useState<string | null>(null);
    const scannerRef = React.useRef<any>(null);
    const lastScanRef = React.useRef<{ code: string; at: number }>({ code: '', at: 0 });
    const onScanRef = React.useRef(onScan);
    onScanRef.current = onScan;

    React.useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        setError(null);
        setLastCode(null);
        setJustScanned(null);

        const stop = async () => {
            const scanner = scannerRef.current;
            scannerRef.current = null;
            if (scanner) {
                try {
                    if (scanner.isScanning) await scanner.stop();
                } catch { /* تجاهل */ }
                try { scanner.clear(); } catch { /* تجاهل */ }
            }
        };

        const start = async () => {
            if (!window.isSecureContext) {
                setError('الكاميرا تتطلب اتصالاً آمناً (HTTPS) أو localhost');
                return;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('المتصفح لا يدعم الوصول للكاميرا');
                return;
            }

            try {
                const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
                if (cancelled) return;

                const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
                    verbose: false,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.QR_CODE,
                    ],
                } as any);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        // بدون qrbox — مسح كامل الإطار: قصّ المنطقة كان يُسقط منطقة الأمان
                        // حول الباركود الشريطي ويمنع قراءته، وكامل الإطار أكثر نجاحاً
                        videoConstraints: {
                            facingMode: 'environment',
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            // تركيز تلقائي مستمر — مهم للمسافات القريبة من الورقة
                            advanced: [{ focusMode: 'continuous' } as any],
                        } as MediaTrackConstraints,
                    },
                    (decodedText: string) => {
                        const now = Date.now();
                        const last = lastScanRef.current;
                        // تجاهل تكرار نفس الكود خلال 1.5 ثانية
                        if (last.code === decodedText && now - last.at < 1500) return;
                        lastScanRef.current = { code: decodedText, at: now };

                        playBeep();
                        setLastCode(decodedText);
                        // وميض أخضر كتأكيد بصري أن الباركود قُرئ
                        setJustScanned(decodedText);
                        onScanRef.current(decodedText);
                        if (!continuous) {
                            // مهلة قصيرة ليرى المستخدم تأكيد القراءة قبل إغلاق النافذة
                            setTimeout(() => {
                                void stop();
                                onClose();
                            }, 800);
                        } else {
                            setTimeout(() => {
                                setJustScanned((prev) => (prev === decodedText ? null : prev));
                            }, 700);
                        }
                    },
                    () => {
                        // أخطاء القراءة المتكررة طبيعية أثناء البحث عن باركود — نتجاهلها
                    }
                );
            } catch (err: any) {
                if (cancelled) return;
                const message = String(err?.name || err?.message || err || '');
                if (message.includes('NotAllowedError') || message.includes('Permission')) {
                    setError('تم رفض إذن الكاميرا — اسمح بالوصول من إعدادات المتصفح');
                } else if (message.includes('NotFoundError') || message.includes('no camera')) {
                    setError('لم يتم العثور على كاميرا في هذا الجهاز');
                } else {
                    setError('تعذر تشغيل الكاميرا — تأكد أنها غير مستخدمة من تطبيق آخر');
                }
            }
        };

        void start();

        return () => {
            cancelled = true;
            void stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, continuous]);

    return (
        <AppModal isOpen={isOpen} onClose={onClose} title={title} size="md">
            <style>{`
                @keyframes barcode-scan-line-move {
                    0%, 100% { top: 6%; }
                    50% { top: 90%; }
                }
                .barcode-scan-line {
                    position: absolute;
                    left: 4%;
                    right: 4%;
                    height: 3px;
                    border-radius: 9999px;
                    background: #34d399;
                    box-shadow: 0 0 10px 2px rgba(52, 211, 153, 0.8);
                    animation: barcode-scan-line-move 1.6s ease-in-out infinite;
                }
            `}</style>
            <div className="space-y-4">
                {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </div>
                ) : (
                    <>
                        <div className="relative mx-auto w-full max-w-md">
                            <div
                                id={SCANNER_ELEMENT_ID}
                                className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-700"
                                style={{ minHeight: 260 }}
                            />

                            {/* إطار إرشادي + خط مسح متحرك ليوضح أن المسح يعمل */}
                            {!justScanned && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="relative h-[45%] w-[85%]">
                                        <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-4 border-t-4 border-emerald-400" />
                                        <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-4 border-t-4 border-emerald-400" />
                                        <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />
                                        <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
                                        <span className="barcode-scan-line" />
                                    </div>
                                </div>
                            )}

                            {/* تأكيد القراءة — وميض أخضر مع قيمة الباركود */}
                            {justScanned && (
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-500/40">
                                    <CheckCircle2 size={48} className="text-white drop-shadow" />
                                    <span className="rounded-lg bg-black/60 px-3 py-1 font-mono text-sm font-bold text-white" dir="ltr">
                                        {justScanned}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Camera size={16} />
                            ضع الباركود داخل الإطار بإضاءة جيدة
                        </div>
                    </>
                )}

                {continuous && lastCode && (
                    <div className="rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        آخر قراءة: <span className="font-mono" dir="ltr">{lastCode}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    className="mx-auto flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                    <X size={16} />
                    {continuous ? 'إنهاء المسح' : 'إلغاء'}
                </button>
            </div>
        </AppModal>
    );
}
