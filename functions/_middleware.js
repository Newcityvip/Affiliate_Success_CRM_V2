export async function onRequest(context) {
  const visitorIp = context.request.headers.get('CF-Connecting-IP');
  const configuredIps = context.env?.ALLOWED_IPS;
  const allowedIps = (typeof configuredIps === 'string' ? configuredIps : '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (visitorIp && allowedIps.includes(visitorIp)) {
    return context.next();
  }

  return new Response('Access Denied', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
