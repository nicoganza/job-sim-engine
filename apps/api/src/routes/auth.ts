import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) { res.status(400).json({ error: 'email required' }); return; }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { res.status(401).json({ error: 'Invalid email or password' }); return; }
  if (user.passwordHash) {
    if (!password) { res.status(401).json({ error: 'Password required' }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Invalid email or password' }); return; }
  }
  const token = jwt.sign({ userId: user.id, organizationId: user.organizationId, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post('/register', async (req, res) => {
  const { companyName, name, email, password } = req.body;
  if (!companyName || !email || !password) { res.status(400).json({ error: 'companyName, email and password are required' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: 'An account with this email already exists' }); return; }

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 7);
  const passwordHash = await bcrypt.hash(password, 10);

  const org = await prisma.organization.create({ data: { name: companyName, slug } });
  const user = await prisma.user.create({ data: { organizationId: org.id, email, name: name || email.split('@')[0], role: 'owner', passwordHash } });

  const token = jwt.sign({ userId: user.id, organizationId: org.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(user);
});

router.get('/organizations/current', requireAuth, async (req: AuthRequest, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
  if (!org) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(org);
});

export default router;
