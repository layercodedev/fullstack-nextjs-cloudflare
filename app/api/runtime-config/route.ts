export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { setRuntimeConfig } from '@/app/utils/runtimeConfig';

type RuntimeConfigRequestBody = {
  docsUrl?: string;
  companyName?: string;
};

const validateRequestBody = (body: RuntimeConfigRequestBody) => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object.' };
  }

  const docsUrl = typeof body.docsUrl === 'string' ? body.docsUrl.trim() : '';
  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';

  if (!docsUrl) {
    return { valid: false, error: 'docsUrl is required.' };
  }
  if (!companyName) {
    return { valid: false, error: 'companyName is required.' };
  }

  return {
    valid: true,
    payload: {
      docsUrl,
      companyName
    }
  } as const;
};

export const POST = async (request: Request) => {
  try {
    const requestBody = (await request.json()) as RuntimeConfigRequestBody;
    const validation = validateRequestBody(requestBody);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    setRuntimeConfig(validation.payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update runtime config', error);
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
};
