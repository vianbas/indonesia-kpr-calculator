import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Common/Card',
  component: Card,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    accent: {
      control: 'select',
      options: ['none', 'blue', 'indigo', 'green', 'orange'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Minimal: Story = {
  args: {
    children: <p className="text-sm text-gray-600">Konten kartu tanpa judul.</p>,
  },
};

export const WithTitle: Story = {
  args: {
    title: 'Hasil Simulasi',
    children: <p className="text-sm text-gray-600">Detail perhitungan KPR akan ditampilkan di sini.</p>,
  },
};

export const WithTitleAndSubtitle: Story = {
  args: {
    title: 'Tabel Amortisasi',
    subtitle: '240 bulan — scroll untuk lihat semua',
    children: <p className="text-sm text-gray-600">Tabel akan muncul di sini.</p>,
  },
};

export const AccentBlue: Story = {
  args: {
    title: 'Info Kredit',
    accent: 'blue',
    children: <p className="text-sm text-gray-600">Aksen biru — digunakan untuk informasi umum.</p>,
  },
};

export const AccentGreen: Story = {
  args: {
    title: 'Ringkasan',
    accent: 'green',
    children: <p className="text-sm text-gray-600">Aksen hijau — digunakan untuk ringkasan hasil.</p>,
  },
};

export const AccentIndigo: Story = {
  args: {
    title: 'Kemampuan Bayar',
    accent: 'indigo',
    children: <p className="text-sm text-gray-600">Aksen indigo — digunakan untuk analisis.</p>,
  },
};

export const AccentOrange: Story = {
  args: {
    title: 'Peringatan',
    accent: 'orange',
    children: <p className="text-sm text-gray-600">Aksen oranye — digunakan untuk peringatan.</p>,
  },
};

export const AllAccents: Story = {
  render: () => (
    <div className="space-y-3">
      {(['none', 'blue', 'indigo', 'green', 'orange'] as const).map((accent) => (
        <Card key={accent} title={`Accent: ${accent}`} accent={accent}>
          <p className="text-sm text-gray-500">Contoh konten kartu dengan aksen {accent}.</p>
        </Card>
      ))}
    </div>
  ),
};
