import type { CalculatedScenario } from '../../application/store/scenarioTypes';
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

// ─── Single-scenario formatters ───────────────────────────────────────────────

function pasangan(s: CalculatedScenario, url: string): string {
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

  lines.push('', 'Cek simulasinya di sini:', url);
  return lines.join('\n');
}

function agen(s: CalculatedScenario, url: string): string {
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

  lines.push('', `Link simulasi: ${url}`);
  return lines.join('\n');
}

function bank(s: CalculatedScenario, url: string): string {
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

  if (d.isSyariah) {
    lines.push('', 'Simulasi ini bersifat estimasi. Tidak menggantikan penawaran resmi dari bank.');
  }

  lines.push('', `Link simulasi: ${url}`);
  return lines.join('\n');
}

// ─── Multi-scenario formatters ────────────────────────────────────────────────

function multiPasangan(scenarios: CalculatedScenario[], url: string): string {
  const lines = ['Halo! Ini perbandingan simulasi KPR yang aku hitung:', ''];

  for (const s of scenarios) {
    const d = coreData(s);
    const g0 = d.groups[0];
    const gN = d.groups[d.groups.length - 1];

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
    lines.push('');
  }

  lines.push('Cek perbandingan lengkap di sini:', url);
  return lines.join('\n');
}

function multiAgen(scenarios: CalculatedScenario[], url: string): string {
  const lines = ['Perbandingan Simulasi KPR', '══════════════════════════', ''];

  for (const s of scenarios) {
    const d = coreData(s);
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
    lines.push('');
  }

  lines.push(`Link simulasi: ${url}`);
  return lines.join('\n');
}

function multiBank(scenarios: CalculatedScenario[], url: string): string {
  const lines = ['PERBANDINGAN KREDIT PEMILIKAN RUMAH', '══════════════════════════════════════', ''];

  for (const s of scenarios) {
    const d = coreData(s);
    lines.push(`[ ${s.label.toUpperCase()} ]`);
    lines.push(`Plafon Kredit  : ${formatIDR(d.loanAmount)}`);
    lines.push(`Jangka Waktu   : ${d.tenorMonths} bulan (${formatTenor(d.tenorMonths)})`);
    lines.push(`Metode         : ${d.method}`);
    lines.push(`Total Bunga    : ${formatIDR(d.totalInterest)}`);
    lines.push(`Total Bayar    : ${formatIDR(d.totalPayment)}`);
    if (d.totalUpfront > 0) {
      lines.push(`Dana Awal      : ${formatIDR(d.totalUpfront)}`);
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
): string {
  if (scenarios.length === 0) return '';

  if (scenarios.length === 1) {
    if (preset === 'pasangan') return pasangan(scenarios[0], url);
    if (preset === 'agen') return agen(scenarios[0], url);
    return bank(scenarios[0], url);
  }

  if (preset === 'pasangan') return multiPasangan(scenarios, url);
  if (preset === 'agen') return multiAgen(scenarios, url);
  return multiBank(scenarios, url);
}
