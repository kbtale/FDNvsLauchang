export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const secretPassword = process.env.ADMIN_PASSWORD || 'FDNvsLauchang2026!';

  if (password === secretPassword) {
    const sessionToken = Buffer.from(`fdn_lauchang_admin:${Date.now()}:${secretPassword}`).toString('base64');
    return res.status(200).json({ success: true, token: sessionToken });
  }

  return res.status(401).json({ error: 'Contraseña de administrador incorrecta' });
}
