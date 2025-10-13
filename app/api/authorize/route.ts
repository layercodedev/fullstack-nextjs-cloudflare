export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export const POST = async (request: Request) => {
  const baseApiUrl = (process.env.LAYERCODE_API_URL || 'https://api.layercode.com').replace(/\/+$/, '');
  const endpoint = `${baseApiUrl}/v1/agents/web/authorize_session`;
  const apiKey = process.env.LAYERCODE_API_KEY;
  if (!apiKey) throw new Error('LAYERCODE_API_KEY is not set.');

  const requestBody = await request.json();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: text || response.statusText }, { status: response.status });
  }
  const responseData = await response.json();
  console.log('Authorize response data:', responseData);
  return NextResponse.json(responseData);
};
