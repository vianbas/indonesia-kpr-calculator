// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import i18n from '../../i18n';
import { MaxPropertyPanel } from '../components/affordability/MaxPropertyPanel';
import { DEFAULT_MAX_PROPERTY, type MaxPropertyFormState } from '../../application/store/maxPropertyTypes';

// Stateful harness so onChange updates re-render the panel (like CalculatorPage).
function Harness({ initial }: { initial?: Partial<MaxPropertyFormState> }) {
  const [form, setForm] = useState<MaxPropertyFormState>({ ...DEFAULT_MAX_PROPERTY, ...initial });
  return (
    <MaxPropertyPanel
      form={form}
      onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
    />
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /how much home can i afford/i }));
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

describe('MaxPropertyPanel', () => {
  it('renders the title and, once open, the income inputs', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /how much home can i afford/i })).toBeInTheDocument();
    openPanel();
    expect(screen.getByLabelText(/monthly income/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spouse/i)).toBeInTheDocument();
  });

  it('shows the empty state until income is entered', () => {
    render(<Harness />);
    openPanel();
    expect(screen.getByText(/enter your monthly income to see/i)).toBeInTheDocument();
  });

  it('shows a max property result once income is typed in', () => {
    render(<Harness />);
    openPanel();
    fireEvent.change(screen.getByLabelText(/monthly income/i), { target: { value: '20000000' } });
    // Exact match avoids colliding with the intro sentence that also mentions the phrase.
    const heroLabel = screen.getByText('Maximum property price');
    expect(heroLabel).toBeInTheDocument();
    expect(within(heroLabel.parentElement!).getByText(/Rp/)).toBeInTheDocument();
  });

  it('shows the existing-debt note when debt is present', () => {
    render(<Harness initial={{ monthlyIncome: '20000000', existingMonthlyDebt: '4000000' }} />);
    openPanel();
    expect(screen.getByText(/existing debt lowers/i)).toBeInTheDocument();
  });

  it('uses Syariah financing terminology when in Syariah mode', () => {
    render(<Harness initial={{ monthlyIncome: '20000000', financingMode: 'syariah' }} />);
    openPanel();
    expect(screen.getByText(/maximum financing/i)).toBeInTheDocument();
    expect(screen.getByText(/estimated margin\/ujrah/i)).toBeInTheDocument();
  });
});
