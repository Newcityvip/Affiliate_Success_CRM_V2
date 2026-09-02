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

async function assertDenied(result) {
  assert.equal(result.continued, false);
  assert.equal(result.response.status, 403);
  assert.equal(await result.response.text(), 'Access Denied');
  assert.equal(result.response.headers.get('Content-Type'), 'text/plain; charset=UTF-8');
  assert.equal(result.response.headers.get('Cache-Control'), 'no-store');
  assert.equal(result.response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
}

(async () => {
  for (const ip of ALLOWED.split(',')) {
    const allowed = await invoke(ip);
    assert.equal(allowed.continued, true);
    assert.equal(allowed.response.status, 200);
  }

  await assertDenied(await invoke('198.51.100.10'));
  await assertDenied(await invoke(undefined));
  await assertDenied(await invoke('139.59.5.188', undefined, false));
  await assertDenied(await invoke('139.59.5.188', ''));

  const whitespace = await invoke(
    '123.231.65.210',
    ' 139.59.5.188,  123.231.65.210 , ,203.189.190.186 '
  );
  assert.equal(whitespace.continued, true);

  await assertDenied(await invoke('139.59.5.18'));
  await assertDenied(await invoke('139.59.5.1880'));

  console.log('Cloudflare Pages IP gate allowlist and fail-closed scenarios passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
