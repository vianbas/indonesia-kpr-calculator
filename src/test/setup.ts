import '@testing-library/jest-dom/vitest';

// @tanstack/react-virtual relies on ResizeObserver which jsdom does not implement
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub;
