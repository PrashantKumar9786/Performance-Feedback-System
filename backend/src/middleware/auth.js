const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

async function loadUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        role: true,
        companyId: true,
        managerId: true,
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.currentUser = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authRequired, requireRoles, loadUser };
