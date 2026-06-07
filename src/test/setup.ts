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
