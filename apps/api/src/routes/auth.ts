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
