import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock scrollIntoView as it's not implemented in JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Set default language for tests to English
localStorage.setItem('studio-one-language', 'en');

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock MediaRecorder
(window as any).MediaRecorder = {
  isTypeSupported: vi.fn().mockReturnValue(true),
  canRecord: vi.fn().mockReturnValue(true),
};

// Mock Image
(window as any).Image = class {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  _src: string = '';
  naturalWidth: number = 1920;
  naturalHeight: number = 1080;
  width: number = 1920;
  height: number = 1080;
  set src(s: string) {
    this._src = s;
    // Trigger onload asynchronously to simulate image loading
    setTimeout(() => this.onload(), 10);
  }
  get src() {
    return this._src;
  }
};

afterEach(() => {
  cleanup();
});
