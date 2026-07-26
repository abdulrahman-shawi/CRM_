'use client';

import * as React from 'react';
import { encodeCode39 } from '@/lib/barcode';

type BarcodeProps = {
    value?: string | null;
    height?: number;
    showValue?: boolean;
    className?: string;
};

/**
 * رسم باركود Code39 المتعارف عليه كـ SVG — قابل للمسح بقارئ الباركود
 */
export function Barcode({ value, height = 40, showValue = true, className }: BarcodeProps) {
    const segments = React.useMemo(() => encodeCode39(String(value || '')), [value]);

    if (!segments) {
        return <span className={className}>—</span>;
    }

    const moduleWidth = 1.6;
    const totalModules = segments.reduce((sum, segment) => sum + segment.width, 0);
    const svgWidth = totalModules * moduleWidth;
    const textHeight = showValue ? 14 : 0;

    let x = 0;
    const positionedBars: React.ReactNode[] = [];
    for (const segment of segments) {
        if (segment.isBar) {
            positionedBars.push(
                <rect
                    key={positionedBars.length}
                    x={x}
                    y={0}
                    width={segment.width * moduleWidth}
                    height={height}
                    fill="currentColor"
                />
            );
        }
        x += segment.width * moduleWidth;
    }

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${svgWidth} ${height + textHeight}`}
            width={svgWidth}
            height={height + textHeight}
            className={className}
            role="img"
            aria-label={`باركود ${value}`}
        >
            {positionedBars}
            {showValue && (
                <text
                    x={svgWidth / 2}
                    y={height + 11}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="monospace"
                    fill="currentColor"
                >
                    {value}
                </text>
            )}
        </svg>
    );
}
