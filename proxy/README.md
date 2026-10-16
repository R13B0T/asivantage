# Vantage proxy

Small Cloudflare Worker so the Anthropic key never reaches the browser.
People type an access code once per session; the Worker adds the real key.

## Deploy
```
cd proxy
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ACCESS_CODE
```
Then set `PROXY_URL` near the top of the script in `index.html` to the Worker URL
(e.g. `https://vantage-proxy.<account>.workers.dev`) and edit `ALLOWED_ORIGIN` in `wrangler.toml`.

Change `ACCESS_CODE` any time to end everyone's access. The Worker only allows
`claude-sonnet-5-5`, caps `max_tokens` at 4000 and rejects other origins.
