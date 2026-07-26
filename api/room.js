// Vercel serverless function: a small key-value + list API backed by Upstash Redis.
// This is what makes the Truth-or-Dare game state AND the live camera call
// actually sync between both players' devices.
//
// Requires these two environment variables in your Vercel project settings:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// (You get both from your free Upstash Redis database dashboard — see README.md)
//
// Request body (always POST, always JSON):
//   { op: 'get',  key }              -> { value }              (null if never set)
//   { op: 'set',  key, value }       -> { ok: true }            (overwrites key)
//   { op: 'push', key, value }       -> { ok: true }            (atomic list append)
//   { op: 'list', key }              -> { value: [...] }        (full list, in order)
//   { op: 'del',  key }              -> { ok: true }            (deletes key/list)
//   { op: 'mget', keys: [...] }      -> { values: [...] }       (batch get, same order)
//
// Design note: every key here is written by exactly one "owner" (e.g. only
// Player 1 ever writes tod:video:p1offer). That means a plain overwrite
// (SET) is always safe — there's no read-modify-write step that could lose
// an update from the other player. List keys (candidates) use Redis' atomic
// RPUSH so simultaneous appends from a single owner never clobber each
// other either.

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

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};
  const op = body.op || 'get';

  async function upstash(cmd) {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmd),
    });
    return r.json();
  }

  try {
    if (op === 'mget') {
      const keys = Array.isArray(body.keys) ? body.keys : [];
      if (!keys.length) {
        res.status(200).json({ values: [] });
        return;
      }
      const data = await upstash(['MGET', ...keys]);
      const values = (data.result || []).map((s) => {
        if (s === null || s === undefined) return null;
        try {
          return JSON.parse(s);
        } catch {
          return s;
        }
      });
      res.status(200).json({ values });
      return;
    }

    const key = body.key;
    if (!key) {
      res.status(400).json({ error: 'Missing key' });
      return;
    }

    if (op === 'get') {
      const data = await upstash(['GET', key]);
      const value = data.result ? JSON.parse(data.result) : null;
      res.status(200).json({ value });
      return;
    }

    if (op === 'set') {
      await upstash(['SET', key, JSON.stringify(body.value)]);
      res.status(200).json({ ok: true });
      return;
    }

    if (op === 'push') {
      await upstash(['RPUSH', key, JSON.stringify(body.value)]);
      res.status(200).json({ ok: true });
      return;
    }

    if (op === 'list') {
      const data = await upstash(['LRANGE', key, '0', '-1']);
      const value = (data.result || []).map((s) => {
        try {
          return JSON.parse(s);
        } catch {
          return s;
        }
      });
      res.status(200).json({ value });
      return;
    }

    if (op === 'del') {
      await upstash(['DEL', key]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Unknown op: ' + op });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
