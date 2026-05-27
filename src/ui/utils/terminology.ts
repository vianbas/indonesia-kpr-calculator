import type { FinancingMode } from '../../domain/models/mortgage.types';

export interface Terminology {
  loanAmount: string;
  interestLabel: string;
  installment: string;
  basicInfo: string;
}

const CONVENTIONAL: Terminology = {
  loanAmount: 'Nilai Kredit',
  interestLabel: 'Bunga',
  installment: 'Cicilan',
  basicInfo: 'Informasi Kredit',
};

const SYARIAH: Terminology = {
  loanAmount: 'Nilai Pembiayaan',
  interestLabel: 'Margin / Ujrah',
  installment: 'Angsuran',
  basicInfo: 'Informasi Pembiayaan',
};

export function getTerminology(mode: FinancingMode): Terminology {
  return mode === 'syariah' ? SYARIAH : CONVENTIONAL;
}
