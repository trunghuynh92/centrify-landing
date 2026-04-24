import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const MAX = {
  name: 120,
  business: 160,
  email: 160,
  branches: 40,
  headache: 2000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let payload: Record<string, unknown> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      payload = Object.fromEntries(form.entries());
    }
  } catch {
    return json(400, { error: 'Invalid body' });
  }

  const name     = clean(payload.name,     MAX.name);
  const business = clean(payload.business, MAX.business);
  const email    = clean(payload.email,    MAX.email);
  const branches = clean(payload.branches, MAX.branches);
  const headache = clean(payload.headache, MAX.headache);
  const hp       = clean((payload as any).company, 200); // honeypot

  if (hp) return json(200, { ok: true });

  if (!name || !business || !email) {
    return json(400, { error: 'Name, business, and email are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return json(400, { error: 'That email address looks off.' });
  }

  const ua = request.headers.get('user-agent')?.slice(0, 400) ?? null;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    clientAddress ||
    null;

  const row = {
    name,
    business,
    email,
    branches: branches || null,
    headache: headache || null,
    user_agent: ua,
    ip,
  };

  const { error } = await supabase.from('waitlist').insert(row);

  if (error) {
    console.error('waitlist insert failed', error);
    return json(500, { error: 'Could not save right now. Try again shortly.' });
  }

  return json(200, { ok: true });
};

export const GET: APIRoute = () =>
  json(405, { error: 'Use POST.' });
