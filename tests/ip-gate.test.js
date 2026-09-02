const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs
  .readFileSync('functions/_middleware.js', 'utf8')
  .replace('export async function onRequest', 'async function onRequest')
  .concat('\nglobalThis.testOnRequest = onRequest;');
const sandbox = { Response };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const ALLOWED = '139.59.5.188,123.231.65.210,203.189.190.186,45.32.109.38';

async function invoke(ip, allowedIps = ALLOWED, includeEnv = true) {
  let continued = false;
  const headers = new Headers();
  if (ip !== undefined) headers.set('CF-Connecting-IP', ip);
  const context = {
    request: { headers },
    next: async () => {
      continued = true;
      return new Response('continued', { status: 200 });
    },
  };
  if (includeEnv) context.env = { ALLOWED_IPS: allowedIps };
  const response = await sandbox.testOnRequest(context);
  return { response, continued };
}

async function assertDenied(result, displayedIp) {
  assert.equal(result.continued, false);
  assert.equal(result.response.status, 403);
  const html = await result.response.text();
  assert.match(html, /Access Restricted/);
  assert.match(html, new RegExp(displayedIp || 'Unavailable'));
  assert.ok(!html.includes('ALLOWED_IPS'));
  assert.equal(result.response.headers.get('Content-Type'), 'text/html; charset=UTF-8');
  assert.equal(result.response.headers.get('Cache-Control'), 'no-store');
  assert.equal(result.response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  return html;
}

(async () => {
  for (const ip of ALLOWED.split(',')) {
    const allowed = await invoke(ip);
    assert.equal(allowed.continued, true);
    assert.equal(allowed.response.status, 200);
  }

  const blockedHtml = await assertDenied(await invoke('198.51.100.10'), '198.51.100.10');
  for (const allowedIp of ALLOWED.split(',')) assert.ok(!blockedHtml.includes(allowedIp));
  await assertDenied(await invoke(undefined));
  await assertDenied(await invoke('139.59.5.188', undefined, false), '139.59.5.188');
  await assertDenied(await invoke('139.59.5.188', ''), '139.59.5.188');

  const whitespace = await invoke(
    '123.231.65.210',
    ' 139.59.5.188,  123.231.65.210 , ,203.189.190.186 '
  );
  assert.equal(whitespace.continued, true);

  await assertDenied(await invoke('139.59.5.18'), '139.59.5.18');
  await assertDenied(await invoke('139.59.5.1880'), '139.59.5.1880');

  const injection = '<script>alert("blocked")</script>&';
  const escapedHtml = await assertDenied(await invoke(injection), '&lt;script&gt;');
  assert.ok(!escapedHtml.includes(injection));
  assert.ok(!escapedHtml.includes('<script>alert'));
  assert.match(escapedHtml, /&lt;script&gt;alert\(&quot;blocked&quot;\)&lt;\/script&gt;&amp;/);

  console.log('Cloudflare Pages IP gate allowlist and fail-closed scenarios passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
