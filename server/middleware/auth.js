const { auth } = require('../firebaseAdmin');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = header.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requirePlan(...plans) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userPlan = req.user.plan || 'free';
    if (plans.length > 0 && !plans.includes(userPlan)) {
      return res.status(403).json({ error: `Requires plan: ${plans.join(' or ')}` });
    }
    next();
  };
}

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-Api-Key header' });
  }
  req.apiKey = apiKey;
  next();
}

module.exports = { verifyToken, requirePlan, requireApiKey };
