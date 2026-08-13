import '@testing-library/jest-dom/vitest';
import '../i18n';

// @tanstack/react-virtual relies on ResizeObserver which jsdom does not implement
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub;

// IntersectionObserver is not implemented in jsdom
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;

// Node >= 26 defines a global `localStorage` accessor that stays undefined
// unless --localstorage-file is passed, and it shadows the jsdom Storage that
// vitest would otherwise install. Fall back to an in-memory Storage so
// browser-env tests behave the same on every Node version.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}
