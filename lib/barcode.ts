// توليد وترميز باركود Code39 (الصيغة المتعارف عليها والمدعومة من كل القوارئ)
// بدون أي مكتبات خارجية — الترميز يُرسم كـ SVG

// أنماط Code39: كل محرف = 9 عناصر (5 أعمدة + 4 فراغات)، 3 منها عريضة
// n = ضيق، w = عريض — تبدأ دائماً بعمود وتنتهي بعمود
const CODE39_PATTERNS: Record<string, string> = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
    'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw',
    'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn',
    'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn', 'K': 'wnnnnnnww', 'L': 'nnwnnnnww',
    'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn',
    'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
    'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw',
    'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
    '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
    '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
    '*': 'nwnnwnwnn', // محرف البداية والنهاية
};

export type BarcodeSegment = { width: number; isBar: boolean };

/**
 * توليد قيمة باركود رقمية تلقائية (12 رقماً):
 * تبدأ بـ 20 ثم جزء من الوقت الحالي ثم رقمين عشوائيين لضمان عدم التكرار
 */
export function generateBarcodeValue(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `20${timestamp}${random}`;
}

/**
 * تحويل قيمة نصية إلى سلسلة أعمدة Code39 جاهزة للرسم.
 * يضيف محرف البداية/النهاية (*) وفراغاً ضيقاً بين المحارف.
 * يعيد null إذا احتوت القيمة على محارف غير مدعومة.
 */
export function encodeCode39(value: string): BarcodeSegment[] | null {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return null;

    const fullText = `*${normalized}*`;
    const segments: BarcodeSegment[] = [];

    for (let charIndex = 0; charIndex < fullText.length; charIndex++) {
        const pattern = CODE39_PATTERNS[fullText[charIndex]];
        if (!pattern) return null;

        for (let i = 0; i < pattern.length; i++) {
            segments.push({
                width: pattern[i] === 'w' ? 3 : 1,
                isBar: i % 2 === 0, // تتناوب: عمود، فراغ، عمود...
            });
        }

        // فراغ ضيق بين المحارف
        if (charIndex < fullText.length - 1) {
            segments.push({ width: 1, isBar: false });
        }
    }

    return segments;
}

/**
 * بناء باركود Code39 كسلسلة SVG نصية — تستخدم لتوليد صورة PNG للطباعة أو الحفظ
 */
export function buildCode39SvgString(value: string, barHeight = 80, moduleWidth = 3): string | null {
    const segments = encodeCode39(value);
    if (!segments) return null;

    const totalModules = segments.reduce((sum, segment) => sum + segment.width, 0);
    const svgWidth = totalModules * moduleWidth;

    let x = 0;
    let rects = "";
    for (const segment of segments) {
        if (segment.isBar) {
            rects += `<rect x="${x}" y="0" width="${segment.width * moduleWidth}" height="${barHeight}" fill="#000"/>`;
        }
        x += segment.width * moduleWidth;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${barHeight}" viewBox="0 0 ${svgWidth} ${barHeight}">${rects}</svg>`;
}
