const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let memoryFallbackState = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body;
      if (payload && typeof payload === 'object') {
        const stateToSave = {
          ...payload,
          updatedAt: Date.now()
        };

        if (REDIS_URL && REDIS_TOKEN) {
          try {
            await fetch(`${REDIS_URL}/set/fdn_lauchang_room_state`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(JSON.stringify(stateToSave))
            });
          } catch (e) {}
        }
        memoryFallbackState = stateToSave;
      }
      return res.status(200).json({ success: true, state: memoryFallbackState });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid state payload' });
    }
  }

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const redisRes = await fetch(`${REDIS_URL}/get/fdn_lauchang_room_state`, {
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`
        }
      });
      const redisData = await redisRes.json();
      if (redisData && redisData.result) {
        const parsed = typeof redisData.result === 'string' ? JSON.parse(redisData.result) : redisData.result;
        if (parsed && typeof parsed === 'object') {
          return res.status(200).json(parsed);
        }
      }
    } catch (e) {}
  }

  return res.status(200).json(memoryFallbackState || {});
}
