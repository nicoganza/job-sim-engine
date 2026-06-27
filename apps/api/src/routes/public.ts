import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/jobs', async (req, res) => {
  const jobs = await prisma.jobPosting.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, description: true, department: true, location: true, remotePolicy: true, seniority: true, employmentType: true, createdAt: true, organization: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(jobs);
});

router.get('/jobs/:jobId', async (req, res) => {
  const job = await prisma.jobPosting.findFirst({
    where: { id: req.params.jobId, status: 'published' },
    select: { id: true, title: true, description: true, department: true, location: true, remotePolicy: true, seniority: true, employmentType: true, createdAt: true, activeSimulationVersionId: true, simulationSkills: true, organization: { select: { name: true } } },
  });
  if (!job) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(job);
});

router.post('/jobs/:jobId/apply', async (req, res) => {
  const { email, name } = req.body;
  if (!email) { res.status(400).json({ error: 'email required' }); return; }

  const job = await prisma.jobPosting.findFirst({ where: { id: req.params.jobId, status: 'published' } });
  if (!job) { res.status(404).json({ error: 'Job not found or no longer accepting applications' }); return; }

  let candidate = await prisma.candidate.findFirst({ where: { organizationId: job.organizationId, email } });
  if (!candidate) {
    candidate = await prisma.candidate.create({ data: { organizationId: job.organizationId, email, name } });
  }

  const existing = await prisma.application.findFirst({ where: { candidateId: candidate.id, jobPostingId: job.id } });
  if (existing) { res.json({ applicationToken: existing.id }); return; }

  const application = await prisma.application.create({
    data: { organizationId: job.organizationId, jobPostingId: job.id, candidateId: candidate.id, status: 'applied', invitedAt: new Date() },
  });

  res.status(201).json({ applicationToken: application.id });
});

export default router;
