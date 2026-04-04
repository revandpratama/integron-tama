import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_URL = 'http://kyogre-ocp.apps.ocp-new-dev.bri.co.id:80/qris_api/qris_pay_bri';
const TIMEOUT_MS = 10_000; // 10 seconds — enough for intranet, fast fail on public wifi

export async function POST(req: NextRequest) {
  const body = await req.json();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = upstream.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await upstream.json()
      : await upstream.text();

    return NextResponse.json(
      { ok: upstream.ok, httpStatus: upstream.status, data, errorType: null },
      { status: 200 }
    );
  } catch (err: any) {
    clearTimeout(timeoutId);

    // Distinguish between timeout vs connection refused / DNS failure
    const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
    const errorType: 'timeout' | 'unreachable' | 'unknown' = isTimeout
      ? 'timeout'
      : err.cause?.code === 'ECONNREFUSED' ||
        err.cause?.code === 'ENOTFOUND' ||
        err.cause?.code === 'ECONNRESET' ||
        err.cause?.code === 'ENETUNREACH'
        ? 'unreachable'
        : 'unknown';

    return NextResponse.json(
      {
        ok: false,
        httpStatus: null,
        data: null,
        errorType,
        errorCode: err.cause?.code ?? null,
        errorMessage: err.message,
      },
      { status: 200 }
    );
  }
}
