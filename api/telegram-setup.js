export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ok:false});
  if (!process.env.TELEGRAM_SETUP_SECRET || req.query?.secret !== process.env.TELEGRAM_SETUP_SECRET) {
    return res.status(401).json({ok:false, error:'Unauthorized'});
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !webhookUrl || !webhookSecret) {
    return res.status(500).json({ok:false, error:'Missing Telegram environment variables'});
  }
  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ['message'],
      drop_pending_updates: true
    })
  });
  const data = await r.json();
  return res.status(r.ok ? 200 : 500).json(data);
}
