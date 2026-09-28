import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn((query) => ({
  matches: false, media: query, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
})) });
Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.HTMLElement.prototype.scrollIntoView = vi.fn();
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
