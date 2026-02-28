import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock scrollIntoView as it's not implemented in JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock MediaRecorder
(window as any).MediaRecorder = {
    isTypeSupported: vi.fn().mockReturnValue(true),
    canRecord: vi.fn().mockReturnValue(true),
};
afterEach(() => {
    cleanup();
});
