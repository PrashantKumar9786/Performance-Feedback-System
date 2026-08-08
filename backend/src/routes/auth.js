const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { authRequired, loadUser } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: { company: { select: { id: true, name: true, slug: true } } },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Server misconfigured: JWT_SECRET is missing" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        title: user.title,
        role: user.role,
        company: user.company,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    if (err.code?.startsWith('P')) {
      return res.status(500).json({
        error: 'Database error — tables may not exist. Run: npm run render:setup on Render.',
      });
    }
    return next(err);
  }
});

router.get('/me', authRequired, loadUser, (req, res) => {
  res.json({ user: req.currentUser });
});

module.exports = router;
