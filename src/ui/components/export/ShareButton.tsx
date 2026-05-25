import { useState } from 'react';
import { Button } from '../common/Button';
import { encodeUrlState } from '../../../utils/urlState';
import type { ScenarioState, ScenarioId } from '../../../application/store/scenarioTypes';

interface Props {
  scenarios: ScenarioState[];
  activeCount: 1 | 2 | 3;
  activeTab: ScenarioId;
  disabled?: boolean;
}

const LinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12.207 2.232a.75.75 0 0 0 .025 1.06l4.146 3.958H6.75A5.25 5.25 0 0 0 1.5 12.5v.25a.75.75 0 0 0 1.5 0v-.25a3.75 3.75 0 0 1 3.75-3.75h9.628l-4.146 3.957a.75.75 0 1 0 1.035 1.086l5.5-5.25a.75.75 0 0 0 0-1.085l-5.5-5.25a.75.75 0 0 0-1.06.024Z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
      clipRule="evenodd"
    />
  </svg>
);

export function ShareButton({ scenarios, activeCount, activeTab, disabled }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const forms = scenarios.slice(0, activeCount).map((s) => s.form);
    const encoded = encodeUrlState({ forms, activeCount, activeTab });

    const url = new URL(window.location.href);
    url.searchParams.set('s', encoded);
    const shareUrl = url.toString();

    history.replaceState(null, '', shareUrl);

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard API may be unavailable in insecure contexts — URL is still updated
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="secondary"
      size="md"
      icon={copied ? <CheckIcon /> : <LinkIcon />}
      onClick={handleShare}
      disabled={disabled}
      aria-label="Salin tautan simulasi ke clipboard"
    >
      {copied ? 'Tautan disalin!' : 'Bagikan'}
    </Button>
  );
}
