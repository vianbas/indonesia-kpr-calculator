import { useState, useEffect, useCallback } from 'react';
import { Button } from '../common/Button';
import { encodeUrlState } from '../../../utils/urlState';
import { formatShareText, PRESET_LABELS, type SharePreset } from '../../utils/shareText';
import type { CalculatedScenario, ScenarioState, ScenarioId } from '../../../application/store/scenarioTypes';

interface Props {
  calculated: CalculatedScenario[];
  allScenarios: ScenarioState[];
  activeCount: 1 | 2 | 3;
  activeTab: ScenarioId;
  disabled?: boolean;
}

const PRESETS: SharePreset[] = ['pasangan', 'agen', 'bank'];

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474l6.733-3.367A2.5 2.5 0 0 1 13 4.5Z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
);

function buildShareUrl(allScenarios: ScenarioState[], activeCount: 1 | 2 | 3, activeTab: ScenarioId): string {
  const forms = allScenarios.slice(0, activeCount).map((s) => s.form);
  const encoded = encodeUrlState({ forms, activeCount, activeTab });
  const url = new URL(window.location.href);
  url.searchParams.set('s', encoded);
  return url.toString();
}

export function ShareReportModal({ calculated, allScenarios, activeCount, activeTab, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<SharePreset>('pasangan');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = buildShareUrl(allScenarios, activeCount, activeTab);
  const text = formatShareText(preset, calculated, shareUrl);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API may be unavailable in insecure contexts
    }
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }

  async function handleCopyLink() {
    history.replaceState(null, '', shareUrl);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard API may be unavailable in insecure contexts
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleWhatsApp() {
    history.replaceState(null, '', shareUrl);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        icon={<ShareIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label="Buka dialog berbagi skenario"
      >
        Bagikan
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h2 id="share-modal-title" className="text-base font-semibold text-gray-900">
                  Bagikan Simulasi
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pilih penerima untuk menyesuaikan format pesan
                </p>
              </div>
              <button
                onClick={close}
                className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Tutup"
              >
                <XIcon />
              </button>
            </div>

            {/* Preset selector */}
            <div className="flex gap-1.5 px-5 pt-4 pb-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={[
                    'flex-1 text-xs font-medium py-2 px-2 rounded-lg border transition-colors',
                    preset === p
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600',
                  ].join(' ')}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Text preview */}
            <div className="px-5 py-3 flex-1 min-h-0">
              <textarea
                readOnly
                value={text}
                className="w-full h-48 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Pratinjau teks yang akan dibagikan"
              />
            </div>

            {/* Action buttons */}
            <div className="px-5 pb-5 pt-1 flex flex-wrap gap-2">
              <button
                onClick={handleWhatsApp}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1fba58] text-white transition-colors"
              >
                <WhatsAppIcon />
                WhatsApp
              </button>
              <Button variant="secondary" size="md" onClick={handleCopyText}>
                {copiedText ? '✓ Tersalin!' : 'Salin Teks'}
              </Button>
              <Button variant="secondary" size="md" onClick={handleCopyLink}>
                {copiedLink ? '✓ Tautan disalin!' : 'Salin Tautan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
