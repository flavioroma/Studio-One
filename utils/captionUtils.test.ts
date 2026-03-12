import { describe, it, expect } from 'vitest';
import { calculateCaptionMetrics, calculateCaptionPosition } from './captionUtils';
import { TextSize, TextPosition } from '../types';

describe('captionUtils', () => {
  describe('calculateCaptionMetrics', () => {
    it('calculates correct font size for large text', () => {
      const metrics = calculateCaptionMetrics(1000, 1000, {
        text: 'Hello',
        textSize: TextSize.Large,
      });
      expect(metrics.fontSize).toBe(70); // 0.07 * 1000
      expect(metrics.lineHeight).toBe(70 * 1.2);
      expect(metrics.padding).toBe(50); // 1000 * 0.05
    });

    it('calculates correct font size for normal text', () => {
      const metrics = calculateCaptionMetrics(1000, 1000, {
        text: 'Hello',
        textSize: TextSize.Small,
      });
      expect(metrics.fontSize).toBe(35); // 0.035 * 1000
    });

    it('splits multiline text correctly', () => {
      const metrics = calculateCaptionMetrics(1000, 1000, {
        text: 'Line 1\nLine 2',
        textSize: TextSize.Small,
      });
      expect(metrics.lines).toEqual(['Line 1', 'Line 2']);
    });
  });

  describe('calculateCaptionPosition', () => {
    const metrics = {
      fontSize: 40,
      lineHeight: 48,
      padding: 50,
      lines: ['Line 1'],
    };

    it('calculates TopLeft position correctly', () => {
      const pos = calculateCaptionPosition(1000, 1000, metrics, TextPosition.TopLeft);
      expect(pos.x).toBe(50); // padding
      expect(pos.y).toBe(50 + 48); // padding + lineHeight
      expect(pos.textAlign).toBe('left');
    });

    it('calculates Center position correctly', () => {
      const pos = calculateCaptionPosition(1000, 1000, metrics, TextPosition.Center);
      expect(pos.x).toBe(500); // 1000 / 2
      expect(pos.y).toBe(500); // 500 - (1-1)*48/2
      expect(pos.textAlign).toBe('center');
    });

    it('calculates BottomRight position correctly', () => {
      const pos = calculateCaptionPosition(1000, 1000, metrics, TextPosition.BottomRight);
      expect(pos.x).toBe(950); // 1000 - 50
      expect(pos.y).toBe(1000 - 50 - 48); // 1000 - 50 - 1*48
      expect(pos.textAlign).toBe('right');
    });
  });
});
