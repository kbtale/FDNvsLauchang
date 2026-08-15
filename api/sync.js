let globalEventState = null;

export default function handler(req, res) {
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
        globalEventState = {
          ...payload,
          updatedAt: Date.now()
        };
      }
      return res.status(200).json({ success: true, state: globalEventState });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid state payload' });
    }
  }

  return res.status(200).json(globalEventState || {});
}
