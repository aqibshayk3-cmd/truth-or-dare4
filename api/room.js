// Vercel serverless function: GET/SET a JSON value in Upstash Redis by key.
// This is what makes the Truth-or-Dare state actually sync between both players' devices.
//
// Requires these two environment variables to be set in your Vercel project:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// (You get both from your free Upstash Redis database dashboard — see README.md)

export default async function handler(req, res) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    res.status(500).json({
      error:
        'Server not configured: missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN environment variables in your Vercel project settings.',
    });
    return;
  }

  const key = (req.query && req.query.key) || 'tod:room-v9';

  try {
    if (req.method === 'GET') {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });
      const data = await r.json();
      const value = data.result ? JSON.parse(data.result) : null;
      res.status(200).json({ value });
      return;
    }

    if (req.method === 'POST') {
      // req.body is already-parsed JSON (Vercel parses it automatically for application/json)
      const payload = JSON.stringify(req.body);
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', key, payload]),
      });
      await r.json();
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
