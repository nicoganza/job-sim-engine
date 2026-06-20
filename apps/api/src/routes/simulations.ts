import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { getModule } from '@job-sim/simulation-modules';
import OpenAI from 'openai';
import https from 'https';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 55000,
  httpAgent: new https.Agent({ keepAlive: true }),
});

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
  const { title, description, estimatedDurationMinutes } = req.body;
  const sim = await prisma.simulation.create({
    data: { title, description, estimatedDurationMinutes, organizationId: req.organizationId!, jobPostingId: job.id, createdByUserId: req.userId!, status: 'draft' },
  });
  res.status(201).json(sim);
});

router.patch('/:simulationId', async (req: AuthRequest, res) => {
  const { title, description, estimatedDurationMinutes } = req.body;
  const sim = await prisma.simulation.updateMany({
    where: { id: req.params.simulationId, organizationId: req.organizationId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(estimatedDurationMinutes !== undefined && { estimatedDurationMinutes }),
    },
  });
  res.json(sim);
});

// Steps
router.post('/:simulationId/steps', async (req: AuthRequest, res) => {
  const { type, title, instructions, config, timeLimitSeconds, isRequired, scoringConfig, skillMapping } = req.body;
  const mod = getModule(type);
  const validation = mod.validateConfig(config);
  if (!validation.success) { res.status(400).json({ error: 'Invalid config', details: validation.errors }); return; }

  const existing = await prisma.simulationStep.findMany({ where: { simulationId: req.params.simulationId }, select: { orderIndex: true } });
  const maxIndex = existing.length ? Math.max(...existing.map(s => s.orderIndex)) : -1;

  const step = await prisma.simulationStep.create({
    data: { type, title, instructions, config, timeLimitSeconds, isRequired, scoringConfig, skillMapping, organizationId: req.organizationId!, simulationId: req.params.simulationId, orderIndex: maxIndex + 1 },
  });
  res.status(201).json(step);
});

router.patch('/:simulationId/steps/:stepId', async (req: AuthRequest, res) => {
  const { type, title, instructions, config, timeLimitSeconds, isRequired, scoringConfig, skillMapping } = req.body;
  if (type && config) {
    const mod = getModule(type);
    const validation = mod.validateConfig(config);
    if (!validation.success) { res.status(400).json({ error: 'Invalid config', details: validation.errors }); return; }
  }
  const step = await prisma.simulationStep.updateMany({
    where: { id: req.params.stepId, organizationId: req.organizationId },
    data: {
      ...(type !== undefined && { type }),
      ...(title !== undefined && { title }),
      ...(instructions !== undefined && { instructions }),
      ...(config !== undefined && { config }),
      ...(timeLimitSeconds !== undefined && { timeLimitSeconds }),
      ...(isRequired !== undefined && { isRequired }),
      ...(scoringConfig !== undefined && { scoringConfig }),
      ...(skillMapping !== undefined && { skillMapping }),
    },
  });
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

router.post('/:simulationId/steps/:stepId/ai-fill', async (req: AuthRequest, res) => {
  const step = await prisma.simulationStep.findFirst({ where: { id: req.params.stepId, organizationId: req.organizationId } });
  if (!step) { res.status(404).json({ error: 'Not found' }); return; }

  const sim = await prisma.simulation.findFirst({
    where: { id: req.params.simulationId, organizationId: req.organizationId },
    include: { jobPosting: { select: { title: true, description: true, department: true } } },
  });

  const job = (sim as any)?.jobPosting;
  const prompt = buildAiFillPrompt(step.type, step.title, step.instructions ?? '', job?.title, job?.description);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    const config = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    await prisma.simulationStep.updateMany({ where: { id: step.id, organizationId: req.organizationId }, data: { config } });
    res.json({ config });
  } catch (err: any) {
    console.error('ai-fill error:', err?.message);
    res.status(500).json({ error: 'AI generation failed' });
  }
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

function buildAiFillPrompt(type: string, title: string, instructions: string, jobTitle?: string, jobDescription?: string): string {
  const ctx = `Role: ${jobTitle || 'Sales professional'}\nJob description: ${(jobDescription || '').slice(0, 600)}\nStep title: ${title}\nStep instructions: ${instructions}`.trim();

  const schemas: Record<string, string> = {
    multiple_choice: `{"question":"situational question relevant to the role","options":[{"id":"a","label":"option text","isCorrect":true},{"id":"b","label":"option text","isCorrect":false},{"id":"c","label":"option text","isCorrect":false},{"id":"d","label":"option text","isCorrect":false}],"allowMultiple":false,"randomizeOptions":true}`,
    free_text: `{"prompt":"what the candidate must write/answer","expectedSignals":["signal 1","signal 2","signal 3"],"redFlags":["red flag 1","red flag 2"],"rubric":[{"key":"clarity","label":"Clarity","maxScore":25,"description":"explanation"},{"key":"depth","label":"Depth","maxScore":25,"description":"explanation"},{"key":"relevance","label":"Relevance","maxScore":25,"description":"explanation"},{"key":"action","label":"Action orientation","maxScore":25,"description":"explanation"}]}`,
    crm_prioritization: `{"scenarioContext":"you are an AE and it's Monday morning...","taskPrompt":"Rank these accounts by priority and explain your reasoning","records":[{"id":"r1","displayName":"Contact Name","company":"Company A","value":80000,"stage":"Negotiation","lastActivityAt":"2024-01-10","healthScore":85,"notes":["note 1"],"visibleSignals":["signal 1"],"hiddenPriorityScore":90,"hiddenRationale":"why this is top priority"},{"id":"r2","displayName":"Contact Name","company":"Company B","value":40000,"stage":"Discovery","lastActivityAt":"2024-01-08","healthScore":60,"notes":[],"visibleSignals":["signal 1"],"hiddenPriorityScore":40,"hiddenRationale":"why this is lower"},{"id":"r3","displayName":"Contact Name","company":"Company C","value":120000,"stage":"Proposal","lastActivityAt":"2024-01-12","healthScore":70,"notes":["urgent"],"visibleSignals":["signal 1","signal 2"],"hiddenPriorityScore":75,"hiddenRationale":"why"},{"id":"r4","displayName":"Contact Name","company":"Company D","value":20000,"stage":"Closed Lost","lastActivityAt":"2023-12-01","healthScore":20,"notes":[],"visibleSignals":["signal 1"],"hiddenPriorityScore":15,"hiddenRationale":"why low priority"}],"expectedTopRecordIds":["r1","r3"],"requiredExplanation":true,"scoringWeights":{"topChoiceAccuracy":0.35,"rankingQuality":0.30,"explanationQuality":0.25,"riskAwareness":0.10}}`,
    notification_reaction: `{"scenarioContext":"It's Tuesday at 9am, you're an AE just arriving at work","taskPrompt":"You have these notifications waiting. Handle each one appropriately.","notifications":[{"id":"n1","senderName":"Sarah Chen","senderRole":"VP Sales","channel":"slack","timestampOffsetMinutes":0,"message":"message text","hiddenUrgency":90,"hiddenImportance":95,"expectedActionTypes":["reply","escalate"],"hiddenRationale":"why this is urgent"},{"id":"n2","senderName":"Tom Baker","senderRole":"Client","channel":"email","timestampOffsetMinutes":5,"message":"message text","hiddenUrgency":75,"hiddenImportance":80,"expectedActionTypes":["reply"],"hiddenRationale":"why"},{"id":"n3","senderName":"System","senderRole":"CRM","channel":"crm_alert","timestampOffsetMinutes":10,"message":"alert text","hiddenUrgency":50,"hiddenImportance":60,"expectedActionTypes":["create_task","ignore"],"hiddenRationale":"why"}],"allowedActions":["reply","ignore","escalate","schedule_followup","create_task"],"scoringWeights":{"actionChoice":0.4,"prioritization":0.3,"communication":0.2,"escalationJudgment":0.1}}`,
    email_response: `{"scenarioContext":"context of the situation","emailThread":[{"id":"e1","from":"client@company.com","to":["rep@yoursaas.com"],"timestamp":"2024-01-15T10:30:00Z","subject":"Subject line","body":"email body content that the candidate must reply to"}],"taskPrompt":"Write a professional reply to this email","expectedSignals":["acknowledges the issue","proposes next steps","professional tone"],"redFlags":["defensive response","blaming","no next step"],"rubric":[{"key":"tone","label":"Professional tone","maxScore":25,"description":"Is the response professional and empathetic?"},{"key":"content","label":"Content quality","maxScore":35,"description":"Does it address all points?"},{"key":"next_steps","label":"Next steps","maxScore":25,"description":"Does it propose clear next steps?"},{"key":"conciseness","label":"Conciseness","maxScore":15,"description":"Is it appropriately concise?"}]}`,
    simulated_call: `{"callType":"sales_discovery","title":"Discovery call with prospect","publicCandidateBrief":"You are an AE at [company]. You have a discovery call with [prospect name], [role] at [company]. Background: [context].","estimatedDurationSeconds":600,"maxDurationSeconds":720,"aiPersona":{"name":"Alex Martinez","role":"Head of Operations","company":"Acme Corp","personality":"Analytical and data-driven. Asks pointed questions. Values ROI clarity.","communicationStyle":"Direct and concise. Gets to the point quickly. Impatient with vague answers.","baselineMood":"skeptical"},"publicBusinessContext":{"candidateCompany":"YourSaaS","productOrService":"B2B SaaS platform","valueProposition":"Reduces operational overhead by 40%","knownContext":["They have 200 employees","They use legacy software"]},"hiddenBuyerState":{"initialInterestLevel":40,"initialTrustLevel":30,"initialUrgencyLevel":25,"hiddenObjections":[{"id":"obj1","type":"budget","description":"Budget is frozen until Q3","revealCondition":"When candidate asks about budget timeline","resolutionCondition":"Candidate acknowledges timing and proposes phased approach","severity":"high"},{"id":"obj2","type":"trust","description":"Bad experience with similar vendor","revealCondition":"When candidate asks about past attempts to solve this","resolutionCondition":"Candidate demonstrates differentiators with evidence","severity":"medium"}],"buyingCriteria":[{"id":"c1","criterion":"Clear ROI within 6 months","importance":"critical"},{"id":"c2","criterion":"Minimal implementation disruption","importance":"high"},{"id":"c3","criterion":"Dedicated support","importance":"medium"}],"dealBreakers":["Requires more than 3 months to implement","No case studies in their industry"]},"allowedOutcomes":["schedule_follow_up","schedule_demo","send_information"],"guardrails":{"doNotRevealHiddenObjectionsDirectly":true,"requireCandidateDiscoveryBeforeRevealingObjections":true,"preventEasyAgreement":true,"stayInPersona":true,"refuseOutOfScenarioRequests":true},"scoringRubric":[{"key":"discovery","label":"Discovery quality","maxScore":30,"description":"Did the candidate ask good open-ended questions to uncover needs?"},{"key":"objection_handling","label":"Objection handling","maxScore":30,"description":"Did the candidate handle objections with empathy and evidence?"},{"key":"value_articulation","label":"Value articulation","maxScore":20,"description":"Did the candidate connect the product to the prospect's specific needs?"},{"key":"next_steps","label":"Next steps","maxScore":20,"description":"Did the candidate secure a clear, concrete next step?"}]}`,
  };

  return `You are an expert at designing realistic job simulation assessments.

CONTEXT:
${ctx}

Generate a realistic, challenging, and highly specific configuration for a "${type}" simulation step.
The scenario MUST be directly relevant to the job role and context above.
Output ONLY a valid JSON object matching this structure exactly:
${schemas[type] ?? '{}'}

Rules:
- Make names, companies, numbers, and scenarios specific and realistic (not generic placeholders)
- Make the scenario genuinely challenging for the target role
- For hidden fields (hiddenRationale, hiddenUrgency, etc.), be specific about WHY
- Adapt the difficulty to a professional-level candidate for this role
- Output ONLY the JSON, no explanation`;
}

export default router;
