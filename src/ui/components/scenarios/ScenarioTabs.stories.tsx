import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ScenarioTabs } from './ScenarioTabs';
import { MOCK_SCENARIOS_1, MOCK_SCENARIOS_2, MOCK_SCENARIOS_3 } from '../../../stories/fixtures';
import type { ScenarioId, ScenarioState } from '../../../application/store/scenarioTypes';

const meta: Meta<typeof ScenarioTabs> = {
  title: 'Scenarios/ScenarioTabs',
  component: ScenarioTabs,
  parameters: { layout: 'padded' },
  argTypes: {
    onTabChange: { action: 'tabChanged' },
    onAdd: { action: 'addScenario' },
    onRemove: { action: 'removeScenario' },
  },
};

export default meta;
type Story = StoryObj<typeof ScenarioTabs>;

export const OneScenario: Story = {
  args: {
    scenarios: MOCK_SCENARIOS_1,
    activeTab: 1,
    canAdd: true,
    onTabChange: () => {},
    onAdd: () => {},
    onRemove: () => {},
  },
};

export const TwoScenarios: Story = {
  args: {
    scenarios: MOCK_SCENARIOS_2,
    activeTab: 1,
    canAdd: true,
    onTabChange: () => {},
    onAdd: () => {},
    onRemove: () => {},
  },
};

export const ThreeScenarios: Story = {
  args: {
    scenarios: MOCK_SCENARIOS_3,
    activeTab: 2,
    canAdd: false,
    onTabChange: () => {},
    onAdd: () => {},
    onRemove: () => {},
  },
};

function InteractiveDemo() {
  const [active, setActive] = useState<ScenarioId>(1);
  const [scenarios, setScenarios] = useState<ScenarioState[]>(MOCK_SCENARIOS_2);
  return (
    <ScenarioTabs
      scenarios={scenarios}
      activeTab={active}
      onTabChange={setActive}
      canAdd={scenarios.length < 3}
      onAdd={() => {
        const id = (scenarios.length + 1) as ScenarioId;
        setScenarios([...scenarios, { ...MOCK_SCENARIOS_1[0], id, label: `Skenario ${id}`, summary: null }]);
        setActive(id);
      }}
      onRename={(id, name) => {
        setScenarios(scenarios.map((s) => s.id === id ? { ...s, label: name } : s));
      }}
      onRemove={(id) => {
        setScenarios(scenarios.filter((s) => s.id !== id));
        if (active === id) setActive(1);
      }}
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
