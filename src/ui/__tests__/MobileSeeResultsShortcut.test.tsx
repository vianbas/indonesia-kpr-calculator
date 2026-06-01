// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MobileSeeResultsShortcut } from '../components/common/MobileSeeResultsShortcut';

afterEach(cleanup);

describe('MobileSeeResultsShortcut', () => {
  it('renders the button when a summary exists', () => {
    render(
      <MobileSeeResultsShortcut
        hasSummary
        hasErrors={false}
        onClick={vi.fn()}
        label="See Results"
        ariaLabel="Jump to results"
      />,
    );
    expect(screen.getByRole('button', { name: 'Jump to results' })).toBeInTheDocument();
    expect(screen.getByText('See Results')).toBeInTheDocument();
  });

  it('renders when there are errors to jump to', () => {
    render(
      <MobileSeeResultsShortcut
        hasSummary={false}
        hasErrors
        onClick={vi.fn()}
        label="See Results"
        ariaLabel="Fix errors"
      />,
    );
    expect(screen.getByRole('button', { name: 'Fix errors' })).toBeInTheDocument();
  });

  it('renders nothing when there is neither a summary nor errors', () => {
    const { container } = render(
      <MobileSeeResultsShortcut
        hasSummary={false}
        hasErrors={false}
        onClick={vi.fn()}
        label="See Results"
        ariaLabel="Jump"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(
      <MobileSeeResultsShortcut
        hasSummary
        hasErrors={false}
        onClick={onClick}
        label="See Results"
        ariaLabel="Jump to results"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Jump to results' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('uses the provided label text', () => {
    render(
      <MobileSeeResultsShortcut
        hasSummary
        hasErrors={false}
        onClick={vi.fn()}
        label="Lihat Hasil"
        ariaLabel="Lompat"
      />,
    );
    expect(screen.getByText('Lihat Hasil')).toBeInTheDocument();
  });
});
