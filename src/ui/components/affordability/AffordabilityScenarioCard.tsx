import { formatIDR, formatIDRCompact, formatPercent } from '../../../domain/utils/currency';
import { Card } from '../common/Card';
import { StressTestTable } from './StressTestTable';
import type { AffordabilityResult, RiskBand } from '../../../domain/calculators/affordability';

const bandConfig: Record<RiskBand, { label: string; badgeClass: string }> = {
  safe: { label: 'Aman', badgeClass: 'bg-green-100 text-green-800' },
  watch: { label: 'Waspada', badgeClass: 'bg-yellow-100 text-yellow-800' },
  risky: { label: 'Berisiko', badgeClass: 'bg-red-100 text-red-800' },
};

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

function Metric({ label, value, sub, valueColor = 'text-gray-900' }: MetricProps) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-bold leading-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

interface Props {
  label: string;
  result: AffordabilityResult;
  maxDSR: number;
}

export function AffordabilityScenarioCard({ label, result, maxDSR }: Props) {
  const band = bandConfig[result.riskBand];

  const dsrColor =
    result.dsrAtHighest > maxDSR
      ? 'text-red-600'
      : result.dsrAtHighest > maxDSR * 0.85
        ? 'text-yellow-700'
        : 'text-green-700';

  const surplusColor = result.netSurplusAtHighest < 0 ? 'text-red-600' : 'text-green-700';

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${band.badgeClass}`}>
            {band.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="DSR Tertinggi"
            value={formatPercent(result.dsrAtHighest, 1)}
            sub={`Batas: ${formatPercent(maxDSR, 0)}`}
            valueColor={dsrColor}
          />
          <Metric
            label="Surplus Terendah"
            value={formatIDRCompact(result.netSurplusAtHighest)}
            sub={formatIDR(result.netSurplusAtHighest)}
            valueColor={surplusColor}
          />
          <Metric
            label="Maks. Kredit Terjangkau"
            value={formatIDRCompact(result.maxAffordableLoan)}
            sub={formatIDR(result.maxAffordableLoan)}
          />
          <Metric
            label="Min. Penghasilan"
            value={formatIDRCompact(result.minRecommendedIncome)}
            sub={formatIDR(result.minRecommendedIncome)}
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Stress Test Kenaikan Bunga
          </p>
          <p className="text-xs text-gray-400 mb-2">
            Mulai periode variabel pertama · satu suku bunga untuk sisa tenor
          </p>
          <StressTestTable rows={result.stressTest} maxDSR={maxDSR} />
        </div>
      </div>
    </Card>
  );
}
