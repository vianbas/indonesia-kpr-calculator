import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { TierRow } from './TierRow';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
  fieldErrors: Record<string, string>;
}

export function TierBuilder({ form, dispatch, fieldErrors }: Props) {
  const { t } = useTranslation();

  const fixedEnd = form.hasFixedPeriod ? parseInt(form.fixedDurationMonths) || 0 : 0;
  const tenorTotal =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);
  const { tiers } = form;

  const fromMonths: number[] = [];
  let next = fixedEnd + 1;
  for (const tier of tiers) {
    fromMonths.push(next);
    next = (parseInt(tier.toMonth) || next) + 1;
  }

  function getTierError(index: number): string | undefined {
    const tierKey = `floatingTiers[${index}]`;
    const fromKey = `floatingTiers[${index}].fromMonth`;
    const toKey = `floatingTiers[${index}].toMonth`;
    return fieldErrors[tierKey] ?? fieldErrors[fromKey] ?? fieldErrors[toKey];
  }

  const globalTierError =
    fieldErrors['floatingTiers[0].fromMonth'] ??
    Object.entries(fieldErrors)
      .filter(([k]) => k.startsWith('floatingTiers'))
      .map(([, v]) => v)
      .find(Boolean);

  return (
    <div className="space-y-3">
      {tiers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center">
          <p className="text-sm text-gray-500 mb-3">{t('form.tierNoRates')}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => dispatch({ type: 'ADD_TIER' })}
          >
            {t('form.tierAddFirst')}
          </Button>
        </div>
      ) : (
        <>
          {tiers.map((tier, i) => (
            <TierRow
              key={tier.id}
              tier={tier}
              index={i}
              totalTiers={tiers.length}
              fromMonth={fromMonths[i] ?? fixedEnd + 1}
              tenorTotal={tenorTotal}
              tierError={getTierError(i)}
              onUpdate={(id, field, value) =>
                dispatch({ type: 'UPDATE_TIER', id, field, value })
              }
              onRemove={(id) => dispatch({ type: 'REMOVE_TIER', id })}
            />
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<span>+</span>}
            onClick={() => dispatch({ type: 'ADD_TIER' })}
          >
            {t('form.tierAdd')}
          </Button>
        </>
      )}

      {tenorTotal > 0 && tiers.length > 0 && (
        <p className="text-xs text-gray-500">
          {t('form.tierCoverageHint', {
            from: fixedEnd + 1,
            yearFrom: Math.ceil((fixedEnd + 1) / 12),
            end: tenorTotal,
            yearEnd: Math.ceil(tenorTotal / 12),
          })}
        </p>
      )}

      {globalTierError && !tiers.some((_, i) => getTierError(i)) && (
        <p className="text-xs text-red-600">⚠ {globalTierError}</p>
      )}
    </div>
  );
}
