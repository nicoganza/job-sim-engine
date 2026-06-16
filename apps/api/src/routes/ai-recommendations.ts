import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { AcceptRecommendationSchema } from '@job-sim/shared';

const router = Router();
router.use(requireAuth);

router.get('/:runId', async (req: AuthRequest, res) => {
  const run = await prisma.aiRecommendationRun.findFirst({ where: { id: req.params.runId, organizationId: req.organizationId } });
  if (!run) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(run);
});

router.post('/:runId/accept', async (req: AuthRequest, res) => {
  const parsed = AcceptRecommendationSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid payload', details: parsed.error.errors }); return; }

  const run = await prisma.aiRecommendationRun.findFirst({ where: { id: req.params.runId, organizationId: req.organizationId } });
  if (!run || run.status !== 'completed') { res.status(400).json({ error: 'Run not completed' }); return; }

  const result = run.result as any;
  const selectedSteps = (result?.recommendedSteps ?? []).filter((s: any) => parsed.data.selectedRecommendationStepIds.includes(s.id));

  const existing = await prisma.simulationStep.findMany({ where: { simulationId: parsed.data.simulationId }, select: { orderIndex: true } });
  let maxIndex = existing.length ? Math.max(...existing.map(s => s.orderIndex)) : -1;

  const createdSteps: object[] = [];
  for (const step of selectedSteps) {
    maxIndex++;
    const created = await prisma.simulationStep.create({
      data: {
        organizationId: req.organizationId!,
        simulationId: parsed.data.simulationId,
        orderIndex: maxIndex,
        type: step.type,
        title: step.title,
        instructions: step.suggestedConfig?.taskPrompt ?? `Complete this ${step.type} task.`,
        config: step.suggestedConfig ?? {},
        scoringConfig: step.suggestedScoringConfig,
        skillMapping: step.targetSkills?.map((skill: string) => ({ skill, weight: 1 / step.targetSkills.length })),
      },
    });
    createdSteps.push(created);
  }

  await prisma.aiRecommendationRun.update({ where: { id: run.id }, data: { status: 'accepted' } });
  res.json({ accepted: createdSteps.length, steps: createdSteps });
});

export default router;
