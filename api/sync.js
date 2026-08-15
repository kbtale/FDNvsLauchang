const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let memoryFallbackState = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body;
      if (payload && typeof payload === 'object') {
        const stateToSave = {
          ...payload,
          updatedAt: payload.updatedAt || Date.now()
        };

        if (REDIS_URL && REDIS_TOKEN) {
          try {
            await fetch(`${REDIS_URL}/set/fdn_lauchang_room_state`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(stateToSave)
            });
          } catch (e) {
            console.error('Redis SET error:', e);
          }
        }
        memoryFallbackState = stateToSave;
        return res.status(200).json({ success: true, state: stateToSave });
      }
      return res.status(400).json({ error: 'Invalid state payload' });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request body' });
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
      if (redisData && redisData.result !== undefined && redisData.result !== null) {
        let parsed = redisData.result;
        while (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {
            break;
          }
        }
        if (parsed && typeof parsed === 'object') {
          memoryFallbackState = parsed;
          return res.status(200).json(parsed);
        }
      }
    } catch (e) {
      console.error('Redis GET error:', e);
    }
  }

  return res.status(200).json(memoryFallbackState || {});
}

