export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const secretPassword = process.env.ADMIN_PASSWORD || 'FDNvsLauchang2026!';

  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    if (decoded.startsWith('fdn_lauchang_admin:') && decoded.endsWith(`:${secretPassword}`)) {
      return res.status(200).json({ valid: true });
    }
  } catch (e) {}

  return res.status(401).json({ valid: false });
}
