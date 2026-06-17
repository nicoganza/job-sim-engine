import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { getModule } from '@job-sim/simulation-modules';

const router = Router();
router.use(requireAuth);

// Get simulation for a job
router.get('/jobs/:jobId/simulation', async (req: AuthRequest, res) => {
  const sim = await prisma.simulation.findFirst({
    where: { jobPostingId: req.params.jobId, organizationId: req.organizationId },
    include: { steps: { orderBy: { orderIndex: 'asc' } }, scenarioAssets: true, versions: { orderBy: { versionNumber: 'desc' }, take: 5 } },
  });
  if (!sim) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(sim);
});

router.post('/jobs/:jobId/simulation', async (req: AuthRequest, res) => {
  const job = await prisma.jobPosting.findFirst({ where: { id: req.params.jobId, organizationId: req.organizationId } });
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
  const sim = await prisma.simulation.create({
    data: { ...req.body, organizationId: req.organizationId!, jobPostingId: job.id, createdByUserId: req.userId!, status: 'draft' },
  });
  res.status(201).json(sim);
});

router.patch('/:simulationId', async (req: AuthRequest, res) => {
  const sim = await prisma.simulation.updateMany({ where: { id: req.params.simulationId, organizationId: req.organizationId }, data: req.body });
  res.json(sim);
});

// Steps
router.post('/:simulationId/steps', async (req: AuthRequest, res) => {
  const { type, config } = req.body;
  const mod = getModule(type);
  const validation = mod.validateConfig(config);
  if (!validation.success) { res.status(400).json({ error: 'Invalid config', details: validation.errors }); return; }

  const existing = await prisma.simulationStep.findMany({ where: { simulationId: req.params.simulationId }, select: { orderIndex: true } });
  const maxIndex = existing.length ? Math.max(...existing.map(s => s.orderIndex)) : -1;

  const step = await prisma.simulationStep.create({
    data: { ...req.body, organizationId: req.organizationId!, simulationId: req.params.simulationId, orderIndex: maxIndex + 1 },
  });
  res.status(201).json(step);
});

router.patch('/:simulationId/steps/:stepId', async (req: AuthRequest, res) => {
  if (req.body.type && req.body.config) {
    const mod = getModule(req.body.type);
    const validation = mod.validateConfig(req.body.config);
    if (!validation.success) { res.status(400).json({ error: 'Invalid config', details: validation.errors }); return; }
  }
  const step = await prisma.simulationStep.updateMany({ where: { id: req.params.stepId, organizationId: req.organizationId }, data: req.body });
  res.json(step);
});

router.delete('/:simulationId/steps/:stepId', async (req: AuthRequest, res) => {
  await prisma.simulationStep.deleteMany({ where: { id: req.params.stepId, organizationId: req.organizationId } });
  res.json({ success: true });
});

router.post('/:simulationId/steps/reorder', async (req: AuthRequest, res) => {
  const { stepIds } = req.body as { stepIds: string[] };
  await Promise.all(stepIds.map((id, idx) => prisma.simulationStep.updateMany({ where: { id, organizationId: req.organizationId }, data: { orderIndex: idx } })));
  res.json({ success: true });
});

// Validate
router.post('/:simulationId/validate', async (req: AuthRequest, res) => {
  const steps = await prisma.simulationStep.findMany({ where: { simulationId: req.params.simulationId, organizationId: req.organizationId } });
  const errors: Record<string, string[]> = {};
  for (const step of steps) {
    const mod = getModule(step.type);
    const result = mod.validateConfig(step.config);
    if (!result.success) errors[step.id] = result.errors ?? [];
  }
  res.json({ valid: Object.keys(errors).length === 0, errors });
});

// Publish - creates immutable version snapshot
router.post('/:simulationId/publish', async (req: AuthRequest, res) => {
  const sim = await prisma.simulation.findFirst({
    where: { id: req.params.simulationId, organizationId: req.organizationId },
    include: { steps: { orderBy: { orderIndex: 'asc' } }, scenarioAssets: true },
  });
  if (!sim) { res.status(404).json({ error: 'Simulation not found' }); return; }

  // Validate all steps
  for (const step of sim.steps) {
    const mod = getModule(step.type);
    const result = mod.validateConfig(step.config);
    if (!result.success) { res.status(400).json({ error: `Step "${step.title}" has invalid config`, details: result.errors }); return; }
  }

  const latestVersion = await prisma.simulationVersion.findFirst({ where: { simulationId: sim.id }, orderBy: { versionNumber: 'desc' } });
  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  const snapshot = {
    simulation: { id: sim.id, title: sim.title, description: sim.description, estimatedDurationMinutes: sim.estimatedDurationMinutes },
    steps: sim.steps.map(s => ({ id: s.id, orderIndex: s.orderIndex, type: s.type, title: s.title, instructions: s.instructions, timeLimitSeconds: s.timeLimitSeconds, isRequired: s.isRequired, config: s.config, scoringConfig: s.scoringConfig, skillMapping: s.skillMapping })),
    scenarioAssets: sim.scenarioAssets.map(a => ({ id: a.id, type: a.type, title: a.title, content: a.content })),
  };

  const version = await prisma.simulationVersion.create({
    data: { organizationId: req.organizationId!, simulationId: sim.id, versionNumber: nextVersionNumber, snapshot, createdByUserId: req.userId!, publishedAt: new Date() },
  });

  await prisma.simulation.update({ where: { id: sim.id }, data: { status: 'active', currentVersionId: version.id } });
  if (sim.jobPostingId) {
    await prisma.jobPosting.update({ where: { id: sim.jobPostingId }, data: { activeSimulationId: sim.id, activeSimulationVersionId: version.id } });
  }
  res.status(201).json(version);
});

router.get('/:simulationId/versions', async (req: AuthRequest, res) => {
  const versions = await prisma.simulationVersion.findMany({ where: { simulationId: req.params.simulationId, organizationId: req.organizationId }, orderBy: { versionNumber: 'desc' } });
  res.json(versions);
});

router.get('/versions/:versionId', async (req: AuthRequest, res) => {
  const version = await prisma.simulationVersion.findFirst({ where: { id: req.params.versionId, organizationId: req.organizationId } });
  if (!version) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(version);
});

export default router;
