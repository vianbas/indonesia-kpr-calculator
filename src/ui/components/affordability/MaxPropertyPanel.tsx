import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { InputField } from '../common/InputField';
import { SelectField } from '../common/SelectField';
import { ChevronIcon } from '../common/ChevronIcon';
import { formatIDR } from '../../../domain/utils/currency';
import { calculateMaxProperty } from '../../../domain/calculators/maxProperty';
import type { MaxPropertyFormState } from '../../../application/store/maxPropertyTypes';

interface Props {
  form: MaxPropertyFormState;
  onChange: <K extends keyof MaxPropertyFormState>(key: K, value: MaxPropertyFormState[K]) => void;
}

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function Stat({ label, value, hero = false }: { label: string; value: string; hero?: boolean }) {
  return (
    <div
      className={
        hero
          ? 'rounded-lg bg-blue-50 border border-blue-100 px-3 py-3'
          : 'rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5'
      }
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={hero ? 'text-lg font-extrabold text-blue-700' : 'text-sm font-bold text-gray-900'}>
        {value}
      </p>
    </div>
  );
}

export function MaxPropertyPanel({ form, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const isSyariah = form.financingMode === 'syariah';
  const result = calculateMaxProperty({
    monthlyIncome: num(form.monthlyIncome),
    spouseIncome: num(form.spouseIncome),
    existingMonthlyDebt: num(form.existingMonthlyDebt),
    maxDsrPercent: num(form.maxDsrPercent),
    annualRatePercent: num(form.annualRatePercent),
    tenorMonths: (parseInt(form.tenorYears) || 0) * 12,
    downPaymentPercent: num(form.downPaymentPercent),
    paymentMethod: form.paymentMethod,
    financingMode: form.financingMode,
  });

  const hasIncome = num(form.monthlyIncome) + num(form.spouseIncome) > 0;

  // Mode-aware labels (do not claim bank approval / Sharia compliance).
  const loanLabel = isSyariah ? t('maxProperty.maxFinancing') : t('maxProperty.maxLoan');
  const rateLabel = isSyariah ? t('maxProperty.marginRate') : t('maxProperty.rate');

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        id={`${panelId}-btn`}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        data-jump-toggle
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>{t('maxProperty.title')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white" id={panelId} role="region" aria-labelledby={`${panelId}-btn`}>
          {/* Inputs */}
          <div className="p-4 border-b border-gray-100 space-y-4">
            <p className="text-xs text-gray-500">{t('maxProperty.intro')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label={t('maxProperty.monthlyIncome')}
                value={form.monthlyIncome}
                onChange={(v) => onChange('monthlyIncome', v)}
                type="number"
                prefix="Rp"
                placeholder="0"
                min="0"
                step="500000"
              />
              <InputField
                label={t('maxProperty.spouseIncome')}
                value={form.spouseIncome}
                onChange={(v) => onChange('spouseIncome', v)}
                type="number"
                prefix="Rp"
                placeholder="0"
                min="0"
                step="500000"
              />
              <InputField
                label={t('maxProperty.existingDebt')}
                value={form.existingMonthlyDebt}
                onChange={(v) => onChange('existingMonthlyDebt', v)}
                type="number"
                prefix="Rp"
                placeholder="0"
                min="0"
                step="100000"
                hint={t('maxProperty.existingDebtHint')}
              />
              <InputField
                label={t('maxProperty.maxDsr')}
                value={form.maxDsrPercent}
                onChange={(v) => onChange('maxDsrPercent', v)}
                type="number"
                suffix="%"
                placeholder="30"
                min="1"
                max="100"
                step="1"
                hint={t('maxProperty.maxDsrHint')}
              />
              <InputField
                label={rateLabel}
                value={form.annualRatePercent}
                onChange={(v) => onChange('annualRatePercent', v)}
                type="number"
                suffix="%"
                placeholder="8"
                min="0"
                step="0.25"
              />
              <InputField
                label={t('maxProperty.tenor')}
                value={form.tenorYears}
                onChange={(v) => onChange('tenorYears', v)}
                type="number"
                suffix={t('maxProperty.years')}
                placeholder="15"
                min="1"
                max="30"
                step="1"
              />
              <InputField
                label={t('maxProperty.downPayment')}
                value={form.downPaymentPercent}
                onChange={(v) => onChange('downPaymentPercent', v)}
                type="number"
                suffix="%"
                placeholder="20"
                min="0"
                max="99"
                step="1"
              />
              <SelectField
                label={t('maxProperty.financingMode')}
                value={form.financingMode}
                onChange={(v) => onChange('financingMode', v)}
                options={[
                  { value: 'conventional', label: t('maxProperty.conventional') },
                  { value: 'syariah', label: t('maxProperty.syariah') },
                ]}
              />
              <SelectField
                label={t('maxProperty.paymentMethod')}
                value={form.paymentMethod}
                onChange={(v) => onChange('paymentMethod', v)}
                options={[
                  { value: 'annuity', label: t('maxProperty.annuity') },
                  { value: 'flat', label: t('maxProperty.flat') },
                ]}
              />
            </div>
          </div>

          {/* Results */}
          <div className="p-4">
            {!hasIncome ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('maxProperty.empty')}</p>
            ) : (
              <div className="space-y-3">
                <Stat label={t('maxProperty.maxPropertyPrice')} value={formatIDR(result.maxPropertyPrice)} hero />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Stat label={loanLabel} value={formatIDR(result.maxLoanAmount)} />
                  <Stat label={t('maxProperty.downPaymentAmount')} value={formatIDR(result.downPaymentAmount)} />
                  <Stat label={t('maxProperty.maxInstallment')} value={`${formatIDR(result.impliedInstallment)}/bln`} />
                  <Stat label={t('maxProperty.dsr')} value={`${result.dsrPercent}%`} />
                </div>

                {result.notes.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {result.notes.map((noteKey) => (
                      <li key={noteKey} className="text-xs text-gray-500 flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        <span>{t(noteKey)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-gray-400">{t('maxProperty.disclaimer')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
