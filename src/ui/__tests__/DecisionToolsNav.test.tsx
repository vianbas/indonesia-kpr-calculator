// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DecisionToolsNav, type NavSection } from '../components/common/DecisionToolsNav';

const sections: NavSection[] = [
  { id: 'section-results', label: 'Results' },
  { id: 'section-affordability', label: 'Affordability' },
  { id: 'section-refinancing', label: 'Refinancing' },
];

// jsdom doesn't implement scrollIntoView — stub it so we can assert on calls.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DecisionToolsNav', () => {
  it('renders a chip per section', () => {
    render(<DecisionToolsNav sections={sections} />);
    expect(screen.getByRole('button', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Affordability' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refinancing' })).toBeInTheDocument();
  });

  it('renders nothing when there are fewer than two sections', () => {
    const { container } = render(<DecisionToolsNav sections={[{ id: 'a', label: 'Only One' }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('scrolls the matching section into view when a chip is clicked', () => {
    // Provide a real target element with the id the chip points to.
    const target = document.createElement('div');
    target.id = 'section-refinancing';
    document.body.appendChild(target);

    render(<DecisionToolsNav sections={sections} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refinancing' }));

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    target.remove();
  });

  it('does not throw when the target id is absent', () => {
    render(<DecisionToolsNav sections={sections} />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Results' }))).not.toThrow();
  });
});
