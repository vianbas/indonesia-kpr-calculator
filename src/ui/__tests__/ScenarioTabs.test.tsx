// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ScenarioTabs } from '../components/scenarios/ScenarioTabs';
import type { ScenarioState } from '../../application/store/scenarioTypes';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeScenario(id: 1 | 2 | 3, label: string): ScenarioState {
  return {
    id,
    label,
    form: {} as ScenarioState['form'],
    dispatch: vi.fn(),
    summary: null,
    errors: [],
    fieldErrors: {},
    isCalcError: false,
  };
}

const TWO_SCENARIOS = [makeScenario(1, 'Skenario 1'), makeScenario(2, 'Skenario 2')];

function renderTabs(onRename = vi.fn()) {
  return render(
    <ScenarioTabs
      scenarios={TWO_SCENARIOS}
      activeTab={1}
      onTabChange={vi.fn()}
      canAdd={false}
      onAdd={vi.fn()}
      onRemove={vi.fn()}
      onRename={onRename}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScenarioTabs — rename', () => {
  afterEach(cleanup);

  it('renders tab labels', () => {
    renderTabs();
    expect(screen.getByText('Skenario 1')).toBeInTheDocument();
    expect(screen.getByText('Skenario 2')).toBeInTheDocument();
  });

  it('shows edit input when pencil button is clicked on active tab', () => {
    renderTabs();
    const pencil = screen.getByRole('button', { name: /Ubah nama Skenario 1/i });
    fireEvent.click(pencil);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onRename with new value on Enter', () => {
    const onRename = vi.fn();
    renderTabs(onRename);
    fireEvent.click(screen.getByRole('button', { name: /Ubah nama Skenario 1/i }));
    const input = screen.getByRole<HTMLInputElement>('textbox');
    fireEvent.change(input, { target: { value: 'BCA 3yr' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith(1, 'BCA 3yr');
  });

  it('calls onRename on blur', () => {
    const onRename = vi.fn();
    renderTabs(onRename);
    fireEvent.click(screen.getByRole('button', { name: /Ubah nama Skenario 1/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Mandiri' } });
    fireEvent.blur(input);
    expect(onRename).toHaveBeenCalledWith(1, 'Mandiri');
  });

  it('cancels edit on Escape without calling onRename', () => {
    const onRename = vi.fn();
    renderTabs(onRename);
    fireEvent.click(screen.getByRole('button', { name: /Ubah nama Skenario 1/i }));
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not show pencil button on inactive tab', () => {
    renderTabs();
    // Tab 2 is inactive — no rename button for it
    const buttons = screen.getAllByRole('button');
    const renameButtons = buttons.filter((b) =>
      b.getAttribute('aria-label')?.includes('Ubah nama Skenario 2'),
    );
    expect(renameButtons).toHaveLength(0);
  });
});
