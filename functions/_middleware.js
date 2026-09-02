function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function accessRestrictedPage(visitorIp) {
  const displayedIp = escapeHtml(visitorIp || 'Unavailable');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Access Restricted | Affiliate Success CRM</title>
  <style>
    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body {
      margin: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #eef2ff;
      background: radial-gradient(circle at top, #21184a 0, #0d1020 42%, #070914 100%);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .card {
      width: min(100%, 560px);
      padding: clamp(28px, 6vw, 48px);
      text-align: center;
      background: rgba(18, 21, 42, .94);
      border: 1px solid rgba(139, 92, 246, .35);
      border-radius: 24px;
      box-shadow: 0 28px 80px rgba(0, 0, 0, .45);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      margin: 0 auto 24px;
      color: #c4b5fd;
      background: rgba(124, 58, 237, .16);
      border: 1px solid rgba(167, 139, 250, .3);
      border-radius: 22px;
    }
    svg { width: 38px; height: 38px; }
    h1 { margin: 0 0 14px; font-size: clamp(28px, 7vw, 40px); letter-spacing: -.03em; }
    p { margin: 0; color: #aeb7d5; font-size: 16px; line-height: 1.65; }
    .label { margin-top: 30px; color: #cbd5e1; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .ip {
      margin: 10px 0 28px;
      padding: 14px 18px;
      overflow-wrap: anywhere;
      color: #ddd6fe;
      background: #0a0d1a;
      border: 1px solid rgba(139, 92, 246, .45);
      border-radius: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: clamp(16px, 4vw, 19px);
    }
    .help { padding-top: 24px; border-top: 1px solid rgba(148, 163, 184, .16); font-size: 14px; }
  </style>
</head>
<body>
  <main class="card">
    <div class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6l-7-3Z"/>
        <rect x="9" y="10" width="6" height="5" rx="1"/>
        <path d="M10.5 10V8.7a1.5 1.5 0 0 1 3 0V10"/>
      </svg>
    </div>
    <h1>Access Restricted</h1>
    <p>This CRM is available only from authorized networks.</p>
    <div class="label">Your current IP address</div>
    <div class="ip">${displayedIp}</div>
    <p class="help">If you believe this IP should be authorized, please contact your CRM administrator.</p>
  </main>
</body>
</html>`;
}

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

  return new Response(accessRestrictedPage(visitorIp), {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
