import { describe, it, expect } from 'vitest';
import { generateId, hashIp, errBody } from './utils';

describe('generateId', () => {
  it('returns kpr_ prefix followed by 8 alphanumeric chars', () => {
    const id = generateId();
    expect(id).toMatch(/^kpr_[A-Za-z0-9]{8}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});

describe('hashIp', () => {
  it('returns a 16-char hex string', async () => {
    const h = await hashIp('127.0.0.1', 'secret');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces the same hash for the same inputs', async () => {
    const h1 = await hashIp('10.0.0.1', 'mysecret');
    const h2 = await hashIp('10.0.0.1', 'mysecret');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different ips', async () => {
    const h1 = await hashIp('10.0.0.1', 'secret');
    const h2 = await hashIp('10.0.0.2', 'secret');
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for different secrets', async () => {
    const h1 = await hashIp('10.0.0.1', 'secret1');
    const h2 = await hashIp('10.0.0.1', 'secret2');
    expect(h1).not.toBe(h2);
  });
});

describe('errBody', () => {
  it('serializes error code and message', () => {
    const body = errBody('NOT_FOUND', 'Share link not found');
    expect(JSON.parse(body)).toEqual({ error: { code: 'NOT_FOUND', message: 'Share link not found' } });
  });
});
