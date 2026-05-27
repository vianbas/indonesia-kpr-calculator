import '@testing-library/jest-dom/vitest';
import '../i18n';

// @tanstack/react-virtual relies on ResizeObserver which jsdom does not implement
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub;
