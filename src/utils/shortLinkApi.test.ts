import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createShortLink, fetchShortLinkPayload } from './shortLinkApi';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('createShortLink', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv('VITE_SHARE_API_URL', 'https://api.example.com');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns id and url on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'kpr_abcdefgh', url: 'https://example.com/s/kpr_abcdefgh' }),
    });

    const result = await createShortLink('encoded-payload');
    expect(result).toEqual({ id: 'kpr_abcdefgh', url: 'https://example.com/s/kpr_abcdefgh' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/share',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns null when API returns non-ok status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    expect(await createShortLink('payload')).toBeNull();
  });

  it('returns null when API response is malformed', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ wrong: 'shape' }) });
    expect(await createShortLink('payload')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect(await createShortLink('payload')).toBeNull();
  });

  it('returns null when VITE_SHARE_API_URL is not configured', async () => {
    vi.stubEnv('VITE_SHARE_API_URL', '');
    expect(await createShortLink('payload')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchShortLinkPayload', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv('VITE_SHARE_API_URL', 'https://api.example.com');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns payload string on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ payload: 'my-encoded-state' }),
    });

    expect(await fetchShortLinkPayload('kpr_abcdefgh')).toBe('my-encoded-state');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/share/kpr_abcdefgh');
  });

  it('returns null on 404', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    expect(await fetchShortLinkPayload('kpr_notfound')).toBeNull();
  });

  it('returns null when payload field is missing', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await fetchShortLinkPayload('kpr_abcdefgh')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect(await fetchShortLinkPayload('kpr_abcdefgh')).toBeNull();
  });

  it('returns null when VITE_SHARE_API_URL is not configured', async () => {
    vi.stubEnv('VITE_SHARE_API_URL', '');
    expect(await fetchShortLinkPayload('kpr_abcdefgh')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
