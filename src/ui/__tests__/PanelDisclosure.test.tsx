// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FlppPanel } from '../components/flpp/FlppPanel';
import { BuyVsRentPanel } from '../components/buyvsrent/BuyVsRentPanel';
import { DEFAULT_FLPP } from '../../application/store/flppTypes';
import { DEFAULT_BUY_VS_RENT } from '../../application/store/buyVsRentTypes';

afterEach(cleanup);

function expectWiredDisclosure() {
  const btn = screen.getByRole('button', { expanded: true });
  const controls = btn.getAttribute('aria-controls');
  expect(controls).toBeTruthy();
  const region = document.getElementById(controls!);
  expect(region).not.toBeNull();
  expect(region!.getAttribute('role')).toBe('region');
  // region points back to the toggle button, completing the disclosure pair
  expect(region!.getAttribute('aria-labelledby')).toBe(btn.id);
  expect(btn.id).toBeTruthy();
}

describe('decision-tool panel disclosure a11y', () => {
  it('FlppPanel wires the toggle to its content region', () => {
    render(<FlppPanel form={DEFAULT_FLPP} onChange={() => {}} result={null} currentInstallment={null} />);
    expectWiredDisclosure();
  });

  it('BuyVsRentPanel wires the toggle to its content region', () => {
    render(<BuyVsRentPanel form={DEFAULT_BUY_VS_RENT} onChange={() => {}} result={null} />);
    expectWiredDisclosure();
  });
});
