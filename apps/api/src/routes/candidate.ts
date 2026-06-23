import { Router } from 'express';
import OpenAI from 'openai';
import https from 'https';
import { prisma } from '../lib/prisma';
import { getModule } from '@job-sim/simulation-modules';
import { scoringQueue } from '../lib/queues';
import { SimulationVersionSnapshot } from '@job-sim/shared';
import { createCandidateSheet, readSheetCells, extractSheetId } from '../lib/google-sheets';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 25000,
  httpAgent: new https.Agent({ keepAlive: true }),
});

const router = Router();

// Get application info (candidate facing - no auth required, uses opaque token)
router.get('/application/:token', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({
    where: { sessionToken: req.params.token },
    include: { jobPosting: { select: { title: true, description: true, department: true } }, simulationVersion: { select: { versionNumber: true, publishedAt: true } } },
  });

  if (!session) {
    // Try as application token (for new sessions before session creation)
    const app = await prisma.application.findFirst({
      where: { id: req.params.token },
      include: { jobPosting: { select: { title: true, description: true, department: true } }, candidate: { select: { name: true, email: true } } },
    });
    if (!app) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ type: 'application', application: app });
    return;
  }

  res.json({ type: 'session', session });
});

// Start simulation session
router.post('/application/:token/start', async (req, res) => {
  const application = await prisma.application.findUnique({
    where: { id: req.params.token },
    include: { jobPosting: true },
  });
  if (!application) { res.status(404).json({ error: 'Application not found' }); return; }

  // Find active simulation version
  const job = await prisma.jobPosting.findUnique({ where: { id: application.jobPostingId } });
  if (!job?.activeSimulationVersionId) { res.status(400).json({ error: 'No active simulation for this job' }); return; }

  const version = await prisma.simulationVersion.findUnique({ where: { id: job.activeSimulationVersionId } });
  if (!version) { res.status(400).json({ error: 'Simulation version not found' }); return; }

  // Check for existing session
  const existing = await prisma.simulationSession.findFirst({
    where: { applicationId: application.id, status: { in: ['not_started', 'in_progress'] } },
  });
  if (existing) { res.json(existing); return; }

  const snapshot = version.snapshot as unknown as SimulationVersionSnapshot;
  const firstStepId = snapshot.steps[0]?.id;

  const session = await prisma.simulationSession.create({
    data: {
      organizationId: application.organizationId,
      applicationId: application.id,
      candidateId: application.candidateId,
      jobPostingId: application.jobPostingId,
      simulationId: job.activeSimulationId!,
      simulationVersionId: version.id,
      status: 'in_progress',
      currentStepId: firstStepId,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.application.update({ where: { id: application.id }, data: { status: 'simulation_in_progress' } });
  await prisma.simulationEvent.create({ data: { organizationId: application.organizationId, sessionId: session.id, eventType: 'session_started' } });

  res.status(201).json(session);
});

// Get session state
router.get('/sessions/:sessionToken', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({
    where: { sessionToken: req.params.sessionToken },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const version = await prisma.simulationVersion.findUnique({ where: { id: session.simulationVersionId } });
  const snapshot = version?.snapshot as unknown as SimulationVersionSnapshot;

  // Strip hidden config from each step
  const publicSteps = snapshot?.steps.map(step => {
    const mod = getModule(step.type);
    return { id: step.id, orderIndex: step.orderIndex, type: step.type, title: step.title, instructions: step.instructions, timeLimitSeconds: step.timeLimitSeconds, isRequired: step.isRequired, publicConfig: mod.getPublicCandidateConfig(step.config) };
  }) ?? [];

  const submissions = await prisma.stepSubmission.findMany({ where: { sessionId: session.id }, select: { stepId: true, status: true, submittedAt: true } });

  res.json({ session, steps: publicSteps, submissions });
});

// Get single step (with public config only)
router.get('/sessions/:sessionToken/steps/:stepId', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }

  const version = await prisma.simulationVersion.findUnique({ where: { id: session.simulationVersionId } });
  const snapshot = version?.snapshot as unknown as SimulationVersionSnapshot;
  const step = snapshot?.steps.find(s => s.id === req.params.stepId);
  if (!step) { res.status(404).json({ error: 'Step not found' }); return; }

  const mod = getModule(step.type);
  const existingSubmission = await prisma.stepSubmission.findFirst({ where: { sessionId: session.id, stepId: step.id } });
  const autosave = await prisma.simulationEvent.findFirst({ where: { sessionId: session.id, stepId: step.id, eventType: 'autosave' }, orderBy: { createdAt: 'desc' } });

  const stepIndex = (snapshot?.steps.findIndex(s => s.id === req.params.stepId) ?? 0) + 1;
  const totalSteps = snapshot?.steps.length ?? 1;

  // Temporary debug: log CRM config to diagnose empty sections
  if (step.type === 'crm_prioritization') {
    const cfg = step.config as any;
    const pubCfg = mod.getPublicCandidateConfig(step.config) as any;
    console.log(`[DEBUG CRM raw] records=${cfg?.records?.length ?? 0} firstRecord=${JSON.stringify(cfg?.records?.[0])?.slice(0, 200)}`);
    console.log(`[DEBUG CRM pub] firstRecord=${JSON.stringify(pubCfg?.records?.[0])?.slice(0, 200)}`);
  }

  res.json({
    step: { id: step.id, orderIndex: step.orderIndex, type: step.type, title: step.title, instructions: step.instructions, timeLimitSeconds: step.timeLimitSeconds, isRequired: step.isRequired, publicConfig: mod.getPublicCandidateConfig(step.config) },
    stepIndex,
    totalSteps,
    submission: existingSubmission ? { status: existingSubmission.status, submittedAt: existingSubmission.submittedAt } : null,
    autosavedAnswer: (autosave?.payload as any)?.answer ?? null,
  });
});

// Track events
router.post('/sessions/:sessionToken/steps/:stepId/events', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.simulationEvent.create({
    data: { organizationId: session.organizationId, sessionId: session.id, stepId: req.params.stepId, eventType: req.body.eventType, payload: req.body.payload },
  });
  res.json({ success: true });
});

// Autosave
router.post('/sessions/:sessionToken/steps/:stepId/autosave', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.simulationEvent.create({
    data: { organizationId: session.organizationId, sessionId: session.id, stepId: req.params.stepId, eventType: 'autosave', payload: { answer: req.body.answer } },
  });
  res.json({ success: true });
});

// Spreadsheet: create candidate copy of template (idempotent)
router.post('/sessions/:sessionToken/steps/:stepId/spreadsheet-start', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session || session.status !== 'in_progress') { res.status(400).json({ error: 'Invalid session' }); return; }

  // Idempotency: return existing sheet if already created
  const existing = await prisma.simulationEvent.findFirst({
    where: { sessionId: session.id, stepId: req.params.stepId, eventType: 'spreadsheet_sheet_created' },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    const payload = existing.payload as any;
    res.json({ sheetId: payload.sheetId, sheetUrl: payload.sheetUrl });
    return;
  }

  const version = await prisma.simulationVersion.findUnique({ where: { id: session.simulationVersionId } });
  const snapshot = version?.snapshot as unknown as SimulationVersionSnapshot;
  const step = snapshot?.steps.find(s => s.id === req.params.stepId);
  if (!step || step.type !== 'spreadsheet_edit') { res.status(404).json({ error: 'Step not found' }); return; }

  const config = step.config as any;
  const templateSheetId = extractSheetId(config.templateSheetUrl ?? '');

  try {
    const { sheetId, sheetUrl } = await createCandidateSheet(templateSheetId);
    await prisma.simulationEvent.create({
      data: { organizationId: session.organizationId, sessionId: session.id, stepId: step.id, eventType: 'spreadsheet_sheet_created', payload: { sheetId, sheetUrl } },
    });
    res.json({ sheetId, sheetUrl });
  } catch (err: any) {
    console.error('[spreadsheet-start] Error creating sheet:', err?.message);
    res.status(500).json({ error: 'Impossibile creare il foglio Google. Verifica la configurazione del template.' });
  }
});

// Submit step
router.post('/sessions/:sessionToken/steps/:stepId/submit', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session || session.status !== 'in_progress') { res.status(400).json({ error: 'Invalid session' }); return; }

  const version = await prisma.simulationVersion.findUnique({ where: { id: session.simulationVersionId } });
  const snapshot = version?.snapshot as unknown as SimulationVersionSnapshot;
  const step = snapshot?.steps.find(s => s.id === req.params.stepId);
  if (!step) { res.status(404).json({ error: 'Step not found' }); return; }

  let answerToSubmit = req.body.answer;

  // For spreadsheet_edit: build answer server-side by reading cells from Google Sheets
  if (step.type === 'spreadsheet_edit') {
    const sheetEvent = await prisma.simulationEvent.findFirst({
      where: { sessionId: session.id, stepId: step.id, eventType: 'spreadsheet_sheet_created' },
      orderBy: { createdAt: 'desc' },
    });
    if (!sheetEvent) {
      res.status(400).json({ error: 'Spreadsheet non ancora avviato. Apri il foglio prima di inviare.' });
      return;
    }
    const { sheetId } = sheetEvent.payload as any;
    const config = step.config as any;
    const cellRefs = (config.cells ?? []).map((c: any) => c.ref) as string[];

    try {
      const capturedCells = await readSheetCells(sheetId, cellRefs);
      answerToSubmit = { candidateSheetId: sheetId, capturedCells };
    } catch (err: any) {
      console.error('[submit] Failed to read sheet cells:', err?.message);
      res.status(500).json({ error: 'Impossibile leggere il foglio Google. Riprova.' });
      return;
    }
  }

  const mod = getModule(step.type);
  const validation = mod.validateAnswer(answerToSubmit);
  if (!validation.success) { res.status(400).json({ error: 'Invalid answer', details: validation.errors }); return; }

  const existing = await prisma.stepSubmission.findFirst({ where: { sessionId: session.id, stepId: step.id } });
  if (existing) { res.json(existing); return; }

  const submission = await prisma.stepSubmission.create({
    data: {
      organizationId: session.organizationId,
      sessionId: session.id,
      candidateId: session.candidateId,
      simulationVersionId: session.simulationVersionId,
      stepId: step.id,
      stepType: step.type,
      status: 'submitted',
      submittedAt: new Date(),
      answer: answerToSubmit,
      scoringStatus: 'queued',
    },
  });

  await scoringQueue.add('scoreSubmission', { submissionId: submission.id, organizationId: session.organizationId });
  await prisma.simulationEvent.create({ data: { organizationId: session.organizationId, sessionId: session.id, stepId: step.id, eventType: 'step_submitted' } });

  // Advance to next step
  const currentIndex = snapshot.steps.findIndex(s => s.id === step.id);
  const nextStep = snapshot.steps[currentIndex + 1];
  await prisma.simulationSession.update({ where: { id: session.id }, data: { currentStepId: nextStep?.id ?? null } });

  res.json({ submission, nextStepId: nextStep?.id ?? null });
});

// Complete session
router.post('/sessions/:sessionToken/complete', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.simulationSession.update({ where: { id: session.id }, data: { status: 'completed', completedAt: new Date() } });
  await prisma.application.update({ where: { id: session.applicationId }, data: { status: 'simulation_completed' } });
  await prisma.simulationEvent.create({ data: { organizationId: session.organizationId, sessionId: session.id, eventType: 'session_completed' } });

  // Create or update candidate result record
  await prisma.candidateResult.upsert({
    where: { sessionId: session.id },
    create: { organizationId: session.organizationId, sessionId: session.id, applicationId: session.applicationId, candidateId: session.candidateId, jobPostingId: session.jobPostingId, simulationVersionId: session.simulationVersionId, status: 'pending' },
    update: { status: 'pending' },
  });

  res.json({ success: true });
});

// Candidate history: all sessions for this candidate
router.get('/sessions/:sessionToken/history', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }

  const [candidate, allSessions] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: session.candidateId } }),
    prisma.simulationSession.findMany({
      where: { candidateId: session.candidateId, organizationId: session.organizationId },
      include: { jobPosting: { select: { title: true, department: true } }, candidateResult: { select: { totalScore: true, recommendation: true } } },
      orderBy: { startedAt: 'desc' },
    }),
  ]);

  res.json({
    candidate: { name: candidate?.name, email: candidate?.email, phone: candidate?.phone },
    sessions: allSessions.map(s => ({
      sessionToken: s.sessionToken,
      jobTitle: s.jobPosting?.title ?? 'Unknown Role',
      department: s.jobPosting?.department,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      totalScore: s.candidateResult?.totalScore ?? null,
      recommendation: s.candidateResult?.recommendation ?? null,
      isCurrent: s.sessionToken === req.params.sessionToken,
    })),
  });
});

// Update candidate profile from apply page
router.patch('/application/:token/profile', async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.token } });
  if (!application) { res.status(404).json({ error: 'Not found' }); return; }

  const { name, phone } = req.body;
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 255)) {
    res.status(400).json({ error: 'name must be a non-empty string under 255 characters' });
    return;
  }
  if (phone !== undefined && (typeof phone !== 'string' || phone.length > 30)) {
    res.status(400).json({ error: 'phone must be a string under 30 characters' });
    return;
  }
  await prisma.candidate.update({ where: { id: application.candidateId }, data: { ...(name ? { name: name.trim() } : {}), ...(phone ? { phone } : {}) } });
  res.json({ success: true });
});

// AI buyer text chat for simulated_call steps
router.post('/sessions/:sessionToken/steps/:stepId/call-chat', async (req, res) => {
  const session = await prisma.simulationSession.findFirst({ where: { sessionToken: req.params.sessionToken } });
  if (!session || session.status !== 'in_progress') { res.status(400).json({ error: 'Invalid session' }); return; }

  const version = await prisma.simulationVersion.findUnique({ where: { id: session.simulationVersionId } });
  const snapshot = version?.snapshot as unknown as SimulationVersionSnapshot;
  const step = snapshot?.steps.find(s => s.id === req.params.stepId);
  if (!step || step.type !== 'simulated_call') { res.status(400).json({ error: 'Not a call step' }); return; }

  const config = step.config as any;
  const messages: { role: 'user' | 'assistant'; content: string }[] = req.body.messages ?? [];

  try {
    const persona = config.aiPersona ?? {};
    const hiddenBuyer = config.hiddenBuyerState ?? {};
    const hiddenObjections: any[] = hiddenBuyer.hiddenObjections ?? [];
    const buyingCriteria: any[] = hiddenBuyer.buyingCriteria ?? [];

    // CRM linkage: if crmLink is enabled, find the candidate's top-ranked CRM lead
    // and use that person's details as extra context for the AI buyer
    let crmLeadContext = '';
    if (config.crmLink) {
      const crmStep = snapshot?.steps.find((s: any) => s.type === 'crm_prioritization');
      if (crmStep) {
        const crmSubmission = await prisma.stepSubmission.findFirst({
          where: { session: { sessionToken: req.params.sessionToken }, stepId: crmStep.id },
          orderBy: { submittedAt: 'desc' },
        });
        const topId = (crmSubmission?.answer as any)?.orderedRecordIds?.[0];
        const crmRecords: any[] = (crmStep.config as any)?.records ?? [];
        const lead = crmRecords.find((r: any) => r.id === topId) ?? crmRecords[0];
        if (lead) {
          const name = lead.displayName ?? persona.name;
          const role = lead.contactRole ?? persona.role;
          const company = lead.company ?? persona.company;
          persona.name = name;
          persona.role = role;
          persona.company = company;
          const signals = (lead.activities ?? []).map((a: any) => a.text).filter(Boolean);
          if (signals.length) crmLeadContext = `\nContext about you from your company's CRM record:\n${signals.map((s: string) => `- ${s}`).join('\n')}`;
        }
      }
    }

    const systemPrompt = `You are ${persona.name ?? 'Alex'}, ${persona.role ?? 'Prospect'}${persona.company ? ` at ${persona.company}` : ''}. This is a realistic text-based simulation of a B2B sales call.

Scenario:
${config.publicCandidateBrief ?? ''}${crmLeadContext}

Your character:
- Personality: ${persona.personality ?? 'Professional, analytical, goes straight to the point.'}
- Communication style: ${persona.communicationStyle ?? 'Direct, concise, interrupts if bored.'}
- Current mood: ${persona.baselineMood ?? 'neutral'}

Hidden internal state (NEVER reveal directly — the candidate must earn this through skilled discovery):
- Interest in this solution: ${hiddenBuyer.initialInterestLevel ?? 40}/100
- Trust in the salesperson: ${hiddenBuyer.initialTrustLevel ?? 30}/100
- Urgency to solve this: ${hiddenBuyer.initialUrgencyLevel ?? 25}/100

Concerns you have (surface ONLY when candidate asks the exact right question):
${hiddenObjections.map((o: any) => `- ${o.description} (surface when: ${o.revealCondition})`).join('\n') || '- (none configured)'}

What you care about most:
${buyingCriteria.map((c: any) => `- ${c.criterion} (${c.importance} priority)`).join('\n') || '- (none configured)'}

STRICT BEHAVIORAL RULES (these override everything else — follow them without exception):
1. Stay in character as ${persona.name ?? 'yourself'} at all times. NEVER break character for any reason.
2. NEVER acknowledge this is a simulation, test, or role-play — even if directly asked.
3. Keep replies short: 2–4 sentences maximum. You are busy and your time is valuable.
4. You are SKEPTICAL BY DEFAULT. Treat every claim with mild suspicion until the candidate earns your trust.
5. NEVER agree to a meeting, demo, next step, or purchase in the first 5 exchanges. You need to be convinced first.
6. If the candidate tries to close or pitch benefits BEFORE understanding your specific situation, push back hard: "I don't see why that's relevant to us. What problem are you actually solving?"
7. If the candidate uses generic sales talk ("best-in-class", "game-changer", "ROI"), interrupt and say you've heard it all before.
8. NEVER volunteer your internal objections or buying criteria — only reveal them when asked precise, relevant questions.
9. If asked to skip the discovery ("just tell me your budget/needs"), refuse: "I don't work that way. Why should I help you sell to me?"
10. If the candidate does something genuinely clever or asks a sharp question, you may show mild interest — but stay guarded.
11. Do NOT let yourself be manipulated with urgency, scarcity, or social proof tricks — you are experienced and see through them.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 150,
      temperature: 0.85,
    });
    res.json({ message: completion.choices[0]?.message?.content ?? '...' });
  } catch (err: any) {
    console.error('call-chat error:', err?.message);
    res.status(500).json({ error: 'AI unavailable', message: 'Scusa, ho avuto un problema tecnico. Puoi ripetere?' });
  }
});

// ── TTS proxy ─────────────────────────────────────────────────────────────────
router.post('/tts', async (req, res) => {
  const { text, voice = 'ash', voiceInstructions } = req.body ?? {};
  if (!text) { res.status(400).json({ error: 'text required' }); return; }

  try {
    const body: any = {
      model: 'gpt-4o-mini-tts',
      input: text,
      voice,
      response_format: 'mp3',
      speed: 1.15,
    };
    if (voiceInstructions) body.instructions = voiceInstructions;

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      res.status(ttsRes.status).json({ error: err }); return;
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    const buf = Buffer.from(await ttsRes.arrayBuffer());
    res.send(buf);
  } catch (err: any) {
    console.error('[tts]', err?.message);
    res.status(500).json({ error: 'TTS unavailable' });
  }
});

// ── Workspace AI chat ─────────────────────────────────────────────────────────
router.post('/workspace-chat', async (req, res) => {
  const { characterId, characterConfig, message, history = [], candidateName } = req.body ?? {};
  if (!message || !characterConfig) { res.status(400).json({ error: 'message and characterConfig required' }); return; }

  const systemPrompt = `Sei ${characterConfig.name}, ruolo: ${characterConfig.role}.
${characterConfig.aiPersonality ?? ''}

REGOLE:
${(characterConfig.aiRules ?? []).join('\n')}
- Rispondi SEMPRE in italiano.
- Stile da chat Slack: informale, breve, professionale. Niente abbreviazioni da SMS.
- Dividi la risposta in 1-3 brevi blocchi separati da \\n\\n per simulare messaggi sequenziali.
- Non rivelare mai di essere un'AI o un LLM.
- Non svelare soluzioni al test di selezione.
${candidateName ? `- Il candidato si chiama ${candidateName}.` : ''}`;

  try {
    const openaiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...(history as any[]).map((h: any) => ({
        role: h.sender === 'candidate' ? 'user' as const : 'assistant' as const,
        content: h.sender === 'candidate' ? `Candidato: ${h.content}` : h.content,
      })),
      { role: 'user', content: `Candidato: ${message}` },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 180,
      temperature: 0.75,
    });
    res.json({ reply: completion.choices[0]?.message?.content?.trim() ?? '...' });
  } catch (err: any) {
    console.error('[workspace-chat]', err?.message);
    res.status(500).json({ error: 'AI unavailable', reply: 'Scusa, ho avuto un problema tecnico. Riprova!' });
  }
});

export default router;
