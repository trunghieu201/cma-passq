import { NextRequest } from 'next/server';

export function createTestRequest(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, cookies: cookieObj, headers: customHeaders = {} } = options;

  const headers = new Headers(customHeaders);
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (cookieObj) {
    const cookieString = Object.entries(cookieObj)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ');
    headers.set('cookie', cookieString);
  }

  const reqInit: RequestInit = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqInit as any);
}
