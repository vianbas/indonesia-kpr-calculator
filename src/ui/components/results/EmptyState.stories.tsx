import type { Meta, StoryObj } from '@storybook/react';
import {
  FormIncompleteState,
  ValidationErrorState,
  CalculationErrorState,
} from './EmptyState';
import type { ValidationError } from '../../../domain';

const meta: Meta = {
  title: 'Results/EmptyState',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-lg mx-auto">
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const FormIncomplete: StoryObj<typeof FormIncompleteState> = {
  render: () => <FormIncompleteState />,
};

const ONE_ERROR: ValidationError[] = [
  { field: 'principalAmount', message: 'Nilai kredit harus lebih dari 0' },
];

const MANY_ERRORS: ValidationError[] = [
  { field: 'principalAmount', message: 'Nilai kredit harus lebih dari 0' },
  { field: 'tenorYears', message: 'Tenor harus antara 1–30 tahun' },
  { field: 'fixedAnnualRate', message: 'Suku bunga tetap harus antara 0–30%' },
  { field: 'floatingAnnualRate', message: 'Suku bunga variabel harus antara 0–30%' },
  { field: 'downPayment', message: 'Uang muka melebihi harga properti' },
  { field: 'adminFee', message: 'Biaya admin harus 0 atau lebih' },
];

export const ValidationOneError: StoryObj<typeof ValidationErrorState> = {
  render: () => <ValidationErrorState errors={ONE_ERROR} />,
};

export const ValidationManyErrors: StoryObj<typeof ValidationErrorState> = {
  render: () => <ValidationErrorState errors={MANY_ERRORS} />,
};

export const CalculationError: StoryObj<typeof CalculationErrorState> = {
  render: () => <CalculationErrorState />,
};
