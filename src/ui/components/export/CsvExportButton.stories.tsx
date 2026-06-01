import type { Meta, StoryObj } from '@storybook/react';
import { CsvExportButton } from './CsvExportButton';
import { MOCK_SCENARIOS_1, MOCK_SCENARIOS_2 } from '../../../stories/fixtures';
import type { ScenarioForCsv } from '../../../infrastructure/csv/csvTypes';

// The tab fixtures already carry { label, form, summary }; the calculated ones
// (summary !== null) satisfy ScenarioForCsv directly.
const single = MOCK_SCENARIOS_1 as unknown as ScenarioForCsv[];
const multi = MOCK_SCENARIOS_2 as unknown as ScenarioForCsv[];

const meta: Meta<typeof CsvExportButton> = {
  title: 'Export/CsvExportButton',
  component: CsvExportButton,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof CsvExportButton>;

export const SingleScenario: Story = {
  args: { scenarios: single },
};

export const MultiScenario: Story = {
  args: { scenarios: multi },
};

export const DisabledNoScenarios: Story = {
  args: { scenarios: [] },
};
