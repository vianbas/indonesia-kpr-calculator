import type { CalculatedScenario } from '../../application/store/scenarioTypes';
import type { DecisionSummaryResult, DecisionFlag } from '../../domain/calculators/decisionSummary';
import { formatIDR, formatIDRCompact, formatPercent, formatTenor } from '../../domain/utils/currency';

const AKAD_LABEL: Record<string, string> = {
  murabahah: 'Murabahah',
  musyarakah_mutanaqishah: 'Musyarakah Mutanaqishah (MMQ)',
};

export type SharePreset = 'pasangan' | 'agen' | 'bank';

export const PRESET_LABELS: Record<SharePreset, string> = {
  pasangan: 'Pasangan',
  agen: 'Agen Properti',
  bank: 'Petugas Bank',
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function methodLabel(method: string): string {
  return method === 'annuity' ? 'Anuitas' : 'Flat Rate';
}

function coreData(s: CalculatedScenario) {
  const { summary, form } = s;
  const propertyPrice = summary.totalPrincipal + summary.downPayment;
  const dpPct = propertyPrice > 0 ? Math.round((summary.downPayment / propertyPrice) * 100) : 0;
  return {
    propertyPrice,
    dpAmount: summary.downPayment,
    dpPct,
    loanAmount: summary.totalPrincipal,
    tenorMonths: summary.originalTenorMonths,
    method: methodLabel(form.paymentMethod),
    totalInterest: summary.totalInterest,
    totalPayment: summary.totalPayment,
    totalUpfront: summary.totalUpfrontCost,
    groups: summary.installmentGroups,
    isSyariah: summary.financingMode === 'syariah',
    akadType: summary.syariahAkadType,
    totalSalePrice: summary.totalSalePrice,
  };
}

function groupLines(s: CalculatedScenario): string[] {
  return s.summary.installmentGroups.map((g) => {
    const type = g.type === 'fixed' ? 'Fixed' : 'Floating';
    return `• Bln ${g.fromMonth}–${g.toMonth}: ${formatPercent(g.annualRate)} (${type}) → ${formatIDR(g.installmentAmount)}/bln`;
  });
}

// ─── Decision verdict helpers ─────────────────────────────────────────────────

function flagText(flag: DecisionFlag): string {
  switch (flag.type) {
    case 'dsr_over':
      return `DSR ${(flag.dsrPct ?? 0).toFixed(1)}% melebihi batas ${(flag.maxDsrPct ?? 0).toFixed(0)}%`;
    case 'negative_surplus':
      return 'Surplus bersih negatif pada cicilan tertinggi';
    case 'rate_shock':
      return `Kenaikan bunga +${flag.rateOffsetPct ?? 1}% sudah bisa membuat DSR berisiko`;
    case 'ltv_over':
      return 'Uang muka di bawah acuan minimum KPR rumah pertama';
    case 'installment_jump':
      return `Cicilan naik ${Math.round(flag.jumpPct ?? 0)}% saat periode bunga variabel`;
  }
}

function suggestionText(flag: DecisionFlag): string | null {
  const sug = flag.suggestions[0];
  if (!sug) return null;
  switch (sug.type) {
    case 'add_dp': return `Tambah DP ${formatIDRCompact(sug.amountIDR ?? 0)}`;
    case 'add_income': return `Butuh tambahan penghasilan ${formatIDRCompact(sug.amountIDR ?? 0)}/bln`;
    case 'reduce_loan': return `Atau kurangi pinjaman ${formatIDRCompact(sug.amountIDR ?? 0)}`;
    case 'extend_fixed': return 'Pertimbangkan memperpanjang periode bunga tetap';
  }
}

// Verdict block for casual (pasangan) preset — emoji-rich, single scenario
function verdictBlockCasual(decision: DecisionSummaryResult): string[] {
  if (decision.verdict === 'incomplete') return [];

  const emoji = decision.verdict === 'safe' ? '✅' : decision.verdict === 'watch' ? '⚠️' : '🚫';
  const label = decision.verdict === 'safe' ? 'Aman' : decision.verdict === 'watch' ? 'Waspada' : 'Berisiko';

  const lines = ['', `📊 Kemampuan bayar: ${label} ${emoji}`];

  const critical = decision.flags.find((f) => f.severity === 'critical');
  if (critical) {
    lines.push(`   • ${flagText(critical)}`);
    const sug = suggestionText(critical);
    if (sug) lines.push(`   → ${sug}`);
  }

  return lines;
}

// Verdict block for formal (agen) preset — brief label, no emoji
function verdictBlockFormal(decision: DecisionSummaryResult, indent = ''): string[] {
  if (decision.verdict === 'incomplete') return [];

  const label = decision.verdict === 'safe' ? 'Aman' : decision.verdict === 'watch' ? 'Waspada' : 'Berisiko';
  const lines = [`${indent}Status Kemampuan : ${label}`];

  const critical = decision.flags.find((f) => f.severity === 'critical');
  if (critical) {
    lines.push(`${indent}  Catatan: ${flagText(critical)}`);
  }

  return lines;
}

// Verdict block for very formal (bank) preset — uppercase section header
function verdictBlockBank(decision: DecisionSummaryResult): string[] {
  if (decision.verdict === 'incomplete') return [];

  const label = decision.verdict === 'safe' ? 'AMAN' : decision.verdict === 'watch' ? 'WASPADA' : 'BERISIKO';
  const lines = [
    '',
    'STATUS KEMAMPUAN BAYAR',
    '─────────────────────────────────────',
    `Status                : ${label}`,
  ];

  for (const flag of decision.flags) {
    lines.push(`Catatan               : ${flagText(flag)}`);
    const sug = suggestionText(flag);
    if (sug) lines.push(`Rekomendasi           : ${sug}`);
  }

  return lines;
}

// ─── Single-scenario formatters ───────────────────────────────────────────────

function pasangan(s: CalculatedScenario, url: string, decision?: DecisionSummaryResult): string {
  const d = coreData(s);
  const loanWord = d.isSyariah ? 'Pembiayaan' : 'Pinjaman';
  const installWord = d.isSyariah ? 'Angsuran' : 'Cicilan';
  const akadLine = d.isSyariah && d.akadType ? `🕌 Akad: ${AKAD_LABEL[d.akadType] ?? d.akadType}` : null;

  const lines = [
    `Halo! Ini hasil simulasi KPR${d.isSyariah ? ' Syariah' : ''} yang aku hitung:`,
    '',
    `🏠 Properti: ${formatIDRCompact(d.propertyPrice)}`,
    `💰 Uang Muka: ${formatIDRCompact(d.dpAmount)}${d.dpPct > 0 ? ` (${d.dpPct}%)` : ''}`,
    `📋 ${loanWord}: ${formatIDRCompact(d.loanAmount)} selama ${formatTenor(d.tenorMonths)}`,
    ...(akadLine ? [akadLine] : []),
    `📅 ${installWord}:`,
    ...groupLines(s).map((l) => '   ' + l),
  ];

  if (d.isSyariah && d.akadType === 'murabahah' && d.totalSalePrice) {
    lines.push(`🏦 Harga Jual Bank: ${formatIDRCompact(d.totalSalePrice)}`);
  }

  if (d.totalUpfront > 0) {
    lines.push(`💵 Dana awal (DP + biaya): ${formatIDRCompact(d.totalUpfront)}`);
  }

  if (decision) lines.push(...verdictBlockCasual(decision));

  lines.push('', 'Cek simulasinya di sini:', url);
  return lines.join('\n');
}

function agen(s: CalculatedScenario, url: string, decision?: DecisionSummaryResult): string {
  const d = coreData(s);
  const sep = '══════════════════════════';
  const title = d.isSyariah ? `Simulasi KPR Syariah — ${s.label}` : `Simulasi KPR — ${s.label}`;
  const loanWord = d.isSyariah ? 'Nilai Pembiayaan' : 'Nilai Kredit';

  const lines = [
    title,
    sep,
    `Harga Properti   : ${formatIDR(d.propertyPrice)}`,
    `Uang Muka        : ${formatIDR(d.dpAmount)}${d.dpPct > 0 ? ` (${d.dpPct}%)` : ''}`,
    `${loanWord.padEnd(16)} : ${formatIDR(d.loanAmount)}`,
    `Tenor            : ${formatTenor(d.tenorMonths)} (${d.tenorMonths} bulan)`,
    ...(d.isSyariah && d.akadType
      ? [`Akad             : ${AKAD_LABEL[d.akadType] ?? d.akadType}`]
      : [`Metode Angsuran  : ${d.method}`]),
    '',
    d.isSyariah ? 'Jadwal Angsuran:' : 'Jadwal Angsuran:',
    ...groupLines(s),
  ];

  if (d.isSyariah && d.akadType === 'murabahah' && d.totalSalePrice) {
    lines.push('', `Harga Jual Bank  : ${formatIDR(d.totalSalePrice)}`);
  }

  if (d.totalUpfront > 0) {
    lines.push('', `Dana Awal        : ${formatIDR(d.totalUpfront)}`);
  }

  if (decision) {
    const block = verdictBlockFormal(decision);
    if (block.length > 0) lines.push('', ...block);
  }

  lines.push('', `Link simulasi: ${url}`);
  return lines.join('\n');
}

function bank(s: CalculatedScenario, url: string, decision?: DecisionSummaryResult): string {
  const d = coreData(s);
  const sep = '══════════════════════════════════════';
  const title = d.isSyariah ? 'SIMULASI KPR SYARIAH / iB' : 'PERMOHONAN KREDIT PEMILIKAN RUMAH';
  const interestWord = d.isSyariah
    ? d.akadType === 'murabahah' ? 'Total Margin' : 'Total Ujrah'
    : 'Total Bunga';

  const lines = [
    title,
    sep,
    `Nilai Properti        : ${formatIDR(d.propertyPrice)}`,
    `Uang Muka             : ${formatIDR(d.dpAmount)}${d.dpPct > 0 ? ` (${d.dpPct}%)` : ''}`,
    `${(d.isSyariah ? 'Nilai Pembiayaan' : 'Plafon Kredit').padEnd(21)} : ${formatIDR(d.loanAmount)}`,
    `Jangka Waktu          : ${d.tenorMonths} bulan (${formatTenor(d.tenorMonths)})`,
    ...(d.isSyariah && d.akadType
      ? [`Akad                  : ${AKAD_LABEL[d.akadType] ?? d.akadType}`]
      : [`Metode Angsuran       : ${d.method}`]),
  ];

  if (!d.isSyariah) {
    lines.push(
      '',
      'JADWAL SUKU BUNGA',
      '─────────────────────────────────────',
      'Periode          Jenis      Suku Bunga  Angsuran',
    );
    for (const g of d.groups) {
      const period = `Bln ${g.fromMonth}–${g.toMonth}`.padEnd(16);
      const type = (g.type === 'fixed' ? 'Fixed' : 'Floating').padEnd(10);
      const rate = formatPercent(g.annualRate).padEnd(11);
      lines.push(`${period} ${type} ${rate} ${formatIDR(g.installmentAmount)}`);
    }
  } else {
    const g0 = d.groups[0];
    if (g0) {
      lines.push('', `Angsuran              : ${formatIDR(g0.installmentAmount)}/bulan`);
    }
    if (d.akadType === 'murabahah' && d.totalSalePrice) {
      lines.push(`Harga Jual Bank       : ${formatIDR(d.totalSalePrice)}`);
    }
  }

  lines.push(
    '',
    'RINGKASAN FINANSIAL',
    '─────────────────────────────────────',
    `Total Pokok           : ${formatIDR(d.loanAmount)}`,
    `${interestWord.padEnd(21)} : ${formatIDR(d.totalInterest)}`,
    `Total Pembayaran      : ${formatIDR(d.totalPayment)}`,
  );

  if (d.totalUpfront > 0) {
    lines.push(`Dana Awal (Cash-to-Close) : ${formatIDR(d.totalUpfront)}`);
  }

  if (decision) lines.push(...verdictBlockBank(decision));

  if (d.isSyariah) {
    lines.push('', 'Simulasi ini bersifat estimasi. Tidak menggantikan penawaran resmi dari bank.');
  }

  lines.push('', `Link simulasi: ${url}`);
  return lines.join('\n');
}

// ─── Multi-scenario formatters ────────────────────────────────────────────────

function multiPasangan(scenarios: CalculatedScenario[], url: string, decisions?: DecisionSummaryResult[]): string {
  const lines = ['Halo! Ini perbandingan simulasi KPR yang aku hitung:', ''];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const d = coreData(s);
    const g0 = d.groups[0];
    const gN = d.groups[d.groups.length - 1];
    const decision = decisions?.[i];

    lines.push(`📌 ${s.label}`);
    lines.push(`   Pinjaman: ${formatIDRCompact(d.loanAmount)} – ${formatTenor(d.tenorMonths)}`);
    if (g0) {
      lines.push(`   Cicilan awal: ${formatIDR(g0.installmentAmount)}/bln (${formatPercent(g0.annualRate)})`);
    }
    if (gN && gN !== g0) {
      lines.push(`   Cicilan akhir: ${formatIDR(gN.installmentAmount)}/bln (${formatPercent(gN.annualRate)})`);
    }
    if (d.totalUpfront > 0) {
      lines.push(`   Dana awal: ${formatIDRCompact(d.totalUpfront)}`);
    }
    if (decision && decision.verdict !== 'incomplete') {
      const emoji = decision.verdict === 'safe' ? '✅' : decision.verdict === 'watch' ? '⚠️' : '🚫';
      const label = decision.verdict === 'safe' ? 'Aman' : decision.verdict === 'watch' ? 'Waspada' : 'Berisiko';
      lines.push(`   📊 ${label} ${emoji}`);
    }
    lines.push('');
  }

  lines.push('Cek perbandingan lengkap di sini:', url);
  return lines.join('\n');
}

function multiAgen(scenarios: CalculatedScenario[], url: string, decisions?: DecisionSummaryResult[]): string {
  const lines = ['Perbandingan Simulasi KPR', '══════════════════════════', ''];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const d = coreData(s);
    const decision = decisions?.[i];

    lines.push(`▸ ${s.label}`);
    lines.push(`  Nilai Kredit : ${formatIDR(d.loanAmount)}`);
    lines.push(`  Tenor        : ${formatTenor(d.tenorMonths)}`);
    lines.push(`  Metode       : ${d.method}`);
    lines.push('  Angsuran:');
    for (const g of d.groups) {
      lines.push(`    • Bln ${g.fromMonth}–${g.toMonth}: ${formatPercent(g.annualRate)} → ${formatIDR(g.installmentAmount)}/bln`);
    }
    if (d.totalUpfront > 0) {
      lines.push(`  Dana Awal    : ${formatIDR(d.totalUpfront)}`);
    }
    if (decision && decision.verdict !== 'incomplete') {
      const label = decision.verdict === 'safe' ? 'Aman' : decision.verdict === 'watch' ? 'Waspada' : 'Berisiko';
      lines.push(`  Kemampuan    : ${label}`);
    }
    lines.push('');
  }

  lines.push(`Link simulasi: ${url}`);
  return lines.join('\n');
}

function multiBank(scenarios: CalculatedScenario[], url: string, decisions?: DecisionSummaryResult[]): string {
  const lines = ['PERBANDINGAN KREDIT PEMILIKAN RUMAH', '══════════════════════════════════════', ''];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const d = coreData(s);
    const decision = decisions?.[i];

    lines.push(`[ ${s.label.toUpperCase()} ]`);
    lines.push(`Plafon Kredit  : ${formatIDR(d.loanAmount)}`);
    lines.push(`Jangka Waktu   : ${d.tenorMonths} bulan (${formatTenor(d.tenorMonths)})`);
    lines.push(`Metode         : ${d.method}`);
    lines.push(`Total Bunga    : ${formatIDR(d.totalInterest)}`);
    lines.push(`Total Bayar    : ${formatIDR(d.totalPayment)}`);
    if (d.totalUpfront > 0) {
      lines.push(`Dana Awal      : ${formatIDR(d.totalUpfront)}`);
    }
    if (decision && decision.verdict !== 'incomplete') {
      const label = decision.verdict === 'safe' ? 'AMAN' : decision.verdict === 'watch' ? 'WASPADA' : 'BERISIKO';
      lines.push(`Status Kemampuan : ${label}`);
    }
    lines.push('Jadwal Bunga:');
    for (const g of d.groups) {
      const type = g.type === 'fixed' ? 'Fixed' : 'Floating';
      lines.push(`  Bln ${g.fromMonth}–${g.toMonth}: ${formatPercent(g.annualRate)} (${type}) → ${formatIDR(g.installmentAmount)}`);
    }
    lines.push('');
  }

  lines.push(`Link simulasi: ${url}`);
  return lines.join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function formatShareText(
  preset: SharePreset,
  scenarios: CalculatedScenario[],
  url: string,
  decisions?: DecisionSummaryResult[],
): string {
  if (scenarios.length === 0) return '';

  if (scenarios.length === 1) {
    const decision = decisions?.[0];
    if (preset === 'pasangan') return pasangan(scenarios[0], url, decision);
    if (preset === 'agen') return agen(scenarios[0], url, decision);
    return bank(scenarios[0], url, decision);
  }

  if (preset === 'pasangan') return multiPasangan(scenarios, url, decisions);
  if (preset === 'agen') return multiAgen(scenarios, url, decisions);
  return multiBank(scenarios, url, decisions);
}
