// Vantage proxy (Cloudflare Worker).
// Holds the Anthropic key as a secret and only forwards /v1/messages calls
// from the Vantage page when the caller supplies the session access code.
//
// Secrets / vars (set in Cloudflare, never in git):
//   ANTHROPIC_API_KEY  secret  the real Anthropic key
//   ACCESS_CODE        secret  code people type in for a session
//   ALLOWED_ORIGIN     var     e.g. https://r13b0t.github.io
const MODEL_ALLOWLIST = ['claude-sonnet-5-5'];
const MAX_TOKENS_CAP = 4000;

function cors(env, extra = {}) {
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN,
    'access-control-allow-headers': 'content-type, x-access-code',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
    ...extra,
  };
}

function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    if (req.headers.get('origin') !== env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });
    if (req.method !== 'POST' || url.pathname !== '/v1/messages') return new Response('Not found', { status: 404, headers: cors(env) });

    const code = req.headers.get('x-access-code') || '';
    if (!env.ACCESS_CODE || !same(code, env.ACCESS_CODE)) {
      return new Response('Invalid access code', { status: 401, headers: cors(env) });
    }

    let body;
    try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors(env) }); }
    if (!MODEL_ALLOWLIST.includes(body.model)) return new Response('Model not allowed', { status: 400, headers: cors(env) });
    body.max_tokens = Math.min(Number(body.max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP);

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: cors(env, { 'content-type': upstream.headers.get('content-type') || 'application/json' }),
    });
  },
};
