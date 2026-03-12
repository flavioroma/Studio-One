import { Slide, TextPosition, TextSize } from '../types';

export interface CaptionStyle {
  text: string;
  textSize: TextSize;
  // We only need text and size for metrics logic
}

export interface CaptionMetrics {
  fontSize: number;
  lineHeight: number;
  padding: number;
  lines: string[];
}

export interface CaptionPosition {
  x: number;
  y: number;
  textAlign: 'left' | 'center' | 'right';
  textBaseline: 'top' | 'bottom' | 'middle'; // Canvas baseline compatibility
}

/**
 * Calculates generic metrics for the caption based on container size and slide settings.
 */
export const calculateCaptionMetrics = (
  containerWidth: number,
  containerHeight: number,
  style: CaptionStyle
): CaptionMetrics => {
  const fontSizeMultiplier = style.textSize === TextSize.Large ? 0.07 : 0.035;
  const fontSize = Math.floor(containerHeight * fontSizeMultiplier);
  const padding = containerWidth * 0.05;
  const lines = style.text ? style.text.split('\n') : [];

  return {
    fontSize,
    lineHeight: fontSize * 1.2,
    padding,
    lines,
  };
};

/**
 * Calculates the exact position for the caption.
 * Returns coordinates relative to the top-left of the container.
 *
 * For Canvas compatible return values:
 * x, y are the anchor points for fillText.
 * textAlign matches CanvasTextAlign.
 */
export const calculateCaptionPosition = (
  containerWidth: number,
  containerHeight: number,
  metrics: CaptionMetrics,
  position: TextPosition
): CaptionPosition => {
  const { padding, lines, lineHeight } = metrics;

  let x = containerWidth / 2;
  let y = containerHeight / 2;
  let textAlign: 'left' | 'center' | 'right' = 'center';

  // Canvas defaults to alphabetic baseline usually, but for positioning blocks we often want explicit control.
  // However, VideoPreview used explicit y calculations. Let's replicate those exact logics.
  // VideoPreview Logic Recap:
  // TL: x=pad, y=pad+LH
  // TR: x=W-pad, y=pad+LH
  // BL: x=pad, y=H-pad-(lines*LH)
  // ... and so on.
  // Note: Canvas fillText draws from the baseline.
  // VideoPreview logic: y = padding + lineHeight. This implies rendering the first line at that baseline.

  switch (position) {
    case TextPosition.TopLeft:
      x = padding;
      y = padding + lineHeight;
      textAlign = 'left';
      break;
    case TextPosition.TopRight:
      x = containerWidth - padding;
      y = padding + lineHeight;
      textAlign = 'right';
      break;
    case TextPosition.BottomLeft:
      x = padding;
      y = containerHeight - padding - lines.length * lineHeight;
      textAlign = 'left';
      break;
    case TextPosition.BottomRight:
      x = containerWidth - padding;
      y = containerHeight - padding - lines.length * lineHeight;
      textAlign = 'right';
      break;
    case TextPosition.Center:
      x = containerWidth / 2;
      // Vertically centered block:
      // Start Y is middle minus half total block height.
      // But we need the baseline of the first line.
      // Total block height approx = lines * lineHeight
      // Center of block is H/2.
      // Top of block is H/2 - (lines * lineHeight)/2
      // Baseline of first line is Top + lineHeight (roughly, simplified).
      // VideoPreview original: y = H/2 - ((lines-1)*LH)/2.
      // This is strange. if 1 line, y=H/2. If 3 lines, y=H/2 - LH.
      // Let's stick to the VideoPreview logic to preserve existing behavior exactly.
      y = containerHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
      textAlign = 'center';
      break;
    case TextPosition.TopCenter:
      x = containerWidth / 2;
      y = padding + lineHeight;
      textAlign = 'center';
      break;
    case TextPosition.BottomCenter:
      x = containerWidth / 2;
      y = containerHeight - padding - lines.length * lineHeight;
      textAlign = 'center';
      break;
  }

  // Determine an effective baseline logic for reuse if needed,
  // but currently the Y is "baseline of the first line" (implied by previous logic)
  // OR "center of something" depending on the case.
  // Actually, wait. Canvas fillText draws at the baseline.
  // If we say y = padding + lineHeight, that's top-aligned text where the first line sits there.
  // If bottom-aligned: y = H - pad - lines*LH. This seems to be the "top" of the text block for bottom aligned?
  // Let's re-read VideoPreview.tsx carefully.
  // ctx.fillText(line, textX, textY + (i * lineHeight));
  // So textY is indeed the Y coordinate of the *first line*.

  return { x, y, textAlign, textBaseline: 'alphabetic' as any };
};

/**
 * Calculates the position for the watermark.
 * Returns the top-left {x, y} coordinates for the image.
 * Uses a fixed padding (5% of container width) and consistent placement.
 */
export const calculateWatermarkPosition = (
  containerWidth: number,
  containerHeight: number,
  watermarkWidth: number,
  watermarkHeight: number,
  position: TextPosition
): { x: number; y: number } => {
  const padding = containerWidth * 0.05; // Consistent 5% padding
  let x = 0;
  let y = 0;

  switch (position) {
    case TextPosition.TopLeft:
      x = padding;
      y = padding;
      break;
    case TextPosition.TopRight:
      x = containerWidth - watermarkWidth - padding;
      y = padding;
      break;
    case TextPosition.BottomLeft:
      x = padding;
      y = containerHeight - watermarkHeight - padding;
      break;
    case TextPosition.BottomRight:
      x = containerWidth - watermarkWidth - padding;
      y = containerHeight - watermarkHeight - padding;
      break;
    case TextPosition.Center:
      x = (containerWidth - watermarkWidth) / 2;
      y = (containerHeight - watermarkHeight) / 2;
      break;
    case TextPosition.TopCenter:
      x = (containerWidth - watermarkWidth) / 2;
      y = padding;
      break;
    case TextPosition.BottomCenter:
      x = (containerWidth - watermarkWidth) / 2;
      y = containerHeight - watermarkHeight - padding;
      break;
  }

  return { x, y };
};
