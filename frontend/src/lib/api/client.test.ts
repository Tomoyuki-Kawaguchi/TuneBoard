import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, clearAccessToken, setAccessToken } from './client';
import { ApiClientError } from './type';

describe('apiClient', () => {
  beforeEach(() => {
    clearAccessToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('POST 時に JSON ヘッダーと Authorization を付与する', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    setAccessToken('access-token');

    await expect(apiClient.post('/lives', { name: 'Spring Live' })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/lives',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Spring Live' }),
        credentials: 'same-origin',
      }),
    );

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('API エラー本文を ApiClientError に載せる', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 400,
          error: 'Bad Request',
          message: 'validation failed',
          timestamp: '2025-03-01T12:00:00',
        }),
        { status: 400 },
      ),
    );

    await expect(apiClient.get('/lives')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 400,
      apiError: expect.objectContaining({ message: 'validation failed' }),
    });
  });

  it('正常応答の JSON 解析に失敗したら ApiClientError を投げる', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not-json', { status: 200 }));

    await expect(apiClient.get('/lives')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('204 レスポンスは undefined を返す', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiClient.delete('/lives/1')).resolves.toBeUndefined();
  });
});