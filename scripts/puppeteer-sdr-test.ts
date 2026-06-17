/**
 * Puppeteer end-to-end test for the SDR Intern simulation.
 * Drives the browser through all 8 phases as a candidate.
 *
 * Usage:
 *   npx tsx scripts/puppeteer-sdr-test.ts [APPLY_URL]
 *
 * If APPLY_URL is not provided, it will register as admin, create the
 * full simulation, then drive the candidate flow.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

const WEB = process.env.WEB_URL || 'https://web-production-a52d7.up.railway.app';
const API = process.env.API_URL || 'https://api-production-c586.up.railway.app';

const HEADLESS = process.env.HEADLESS !== 'false';

const COMPANY_EMAIL = 'admin@pillar-test.com';
const COMPANY_PASSWORD = 'Pillar2024!';
const COMPANY_NAME = 'Pillar';

let browser: Browser;
let page: Page;

function log(msg: string) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }
function err(msg: string) { console.error(`[ERR] ${msg}`); }

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function apiFetch(method: string, path: string, body?: object, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { rawText: text }; }
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function screenshot(name: string) {
  await page.screenshot({ path: `scripts/screenshots/${name}.png`, fullPage: false });
}

async function waitForNav() {
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
}

// ── Step 1: Ensure admin + simulation exist, get apply URL ──────────────────

async function ensureSimulationAndGetApplyUrl(): Promise<string> {
  // If CLI arg provided, use it directly
  if (process.argv[2]?.startsWith('http')) {
    log(`Using provided apply URL: ${process.argv[2]}`);
    return process.argv[2];
  }

  log('Setting up simulation via API...');

  // Register or login
  let token: string;
  try {
    const reg = await apiFetch('POST', '/api/register', {
      companyName: COMPANY_NAME,
      name: 'Lorenzo Rossi',
      email: COMPANY_EMAIL,
      password: COMPANY_PASSWORD,
    });
    token = reg.token;
    log('✓ Registered as Pillar admin');
  } catch {
    const login = await apiFetch('POST', '/api/login', { email: COMPANY_EMAIL, password: COMPANY_PASSWORD });
    token = login.token;
    log('✓ Logged in as Pillar admin');
  }

  // Create job
  const job = await apiFetch('POST', '/api/jobs', {
    title: 'SDR Intern',
    description: 'Simulazione completa SDR Intern — Alpha x Pillar',
    department: 'Sales',
    location: 'Milano',
    seniority: 'intern',
    employmentType: 'internship',
  }, token);
  log(`✓ Created job: ${job.id}`);

  // Create simulation
  const sim = await apiFetch('POST', `/api/jobs/${job.id}/simulation`, {
    title: 'SDR Intern Day-in-the-Life',
    description: '8-phase simulation for SDR Intern candidates',
    estimatedDurationMinutes: 45,
  }, token);
  log(`✓ Created simulation: ${sim.id}`);

  const simId = sim.id;

  async function addStep(data: object) {
    return apiFetch('POST', `/api/simulations/${simId}/steps`, data, token);
  }

  // Phase 1 - Welcome
  await addStep({
    type: 'welcome',
    title: 'Welcome to Pillar — Day 1',
    instructions: 'Leggi il messaggio del Founder e il messaggio Slack del tuo manager prima di iniziare.',
    config: {
      founderName: 'Marco Pellegrini',
      founderRole: 'Founder & CEO, Pillar',
      founderMessage: 'Ciao, benvenuto in Pillar!\n\nSono Marco. Quello che stai per vivere è la tua prima giornata come SDR Intern. Hai 45 minuti. Buona fortuna!',
      slackMessage: {
        sender: 'Giulia Ferrari',
        role: 'Sales Manager',
        message: 'Ciao! Benvenuto nel team 🎉 Oggi voglio capire come ragioni. Cominciamo!',
      },
      minReadSeconds: 5,
    },
  });

  // Phase 2 - CRM
  await addStep({
    type: 'crm_prioritization',
    title: 'Inbox Prioritization — CRM',
    instructions: 'Ordina i 4 lead dal più al meno prioritario e spiega il tuo ragionamento.',
    timeLimitSeconds: 300,
    config: {
      scenarioContext: 'Sono le 9:00. Hai 4 lead nel CRM. Decidi chi contattare per primo.',
      taskPrompt: 'Trascina i lead nell\'ordine di priorità e spiega la tua logica.',
      records: [
        { id: 'lead-1', displayName: 'Roberto Esposito', company: 'Impresa Edile Esposito SpA', value: 45000, stage: 'New', lastActivityAt: new Date(Date.now() - 3600000).toISOString(), healthScore: 70, notes: ['Demo richiesta', 'Urgenza: "problema pipeline"'], visibleSignals: ['Demo requested', '350 dipendenti', 'Urgency signal'], hiddenPriorityScore: 90, hiddenRationale: 'High ACV + demo request + urgency' },
        { id: 'lead-2', displayName: 'Luca Moretti', company: 'Moretti Costruzioni', value: 22000, stage: 'New', lastActivityAt: new Date(Date.now() - 1800000).toISOString(), healthScore: 75, notes: ['Features page ×5 today', 'Video demo watched'], visibleSignals: ['High engagement today', '80 dipendenti'], hiddenPriorityScore: 80, hiddenRationale: 'Active evaluation phase' },
        { id: 'lead-3', displayName: 'Maria Greco', company: 'Greco & Partners', value: 12000, stage: 'Contacted', lastActivityAt: new Date(Date.now() - 18000000).toISOString(), healthScore: 60, notes: ['Ha risposto "interessante, ma non ora"'], visibleSignals: ['Replied to email', 'Not urgent'], hiddenPriorityScore: 40, hiddenRationale: 'Low urgency explicit' },
        { id: 'lead-4', displayName: 'Valentina Costa', company: 'Costa Impianti', value: 8000, stage: 'New', lastActivityAt: new Date(Date.now() - 172800000).toISOString(), healthScore: 35, notes: ['Homepage only, 48h ago'], visibleSignals: ['Homepage only', '48h ago'], hiddenPriorityScore: 20, hiddenRationale: 'Low intent' },
      ],
      maxRankedItems: 4,
      requiredExplanation: true,
      expectedTopRecordIds: ['lead-1', 'lead-2'],
      scoringWeights: { topChoiceAccuracy: 0.4, rankingQuality: 0.3, explanationQuality: 0.2, riskAwareness: 0.1 },
    },
  });

  // Phase 3 - Discovery Call
  await addStep({
    type: 'simulated_call',
    title: 'Discovery Call — Roberto Esposito',
    instructions: 'Conduci una discovery call con Roberto. Scopri il suo problema prima di parlare del prodotto.',
    timeLimitSeconds: 600,
    config: {
      callType: 'sales_discovery',
      title: 'Discovery Call con Roberto Esposito',
      publicCandidateBrief: 'Roberto Esposito, COO di Impresa Edile Esposito (350 dip., 25 cantieri) ha richiesto una demo. Conduci una discovery call per capire il suo problema prima di presentare il prodotto.',
      estimatedDurationSeconds: 300,
      maxDurationSeconds: 600,
      aiPersona: {
        name: 'Roberto Esposito',
        role: 'COO',
        company: 'Impresa Edile Esposito SpA',
        personality: 'Diretto, pragmatico, scettico ma aperto',
        communicationStyle: 'Conciso, preferisce dati a promesse',
        baselineMood: 'busy',
      },
      publicBusinessContext: {
        candidateCompany: 'Pillar',
        productOrService: 'Pipeline management SaaS',
        valueProposition: 'Visibilità real-time sulla pipeline commerciale',
        knownContext: ['Ha richiesto una demo', 'Urgenza dichiarata con la pipeline'],
      },
      hiddenBuyerState: {
        initialInterestLevel: 55,
        initialTrustLevel: 35,
        initialUrgencyLevel: 70,
        hiddenObjections: [
          { id: 'obj-1', type: 'trust', description: 'Ho già provato un CRM — non lo ha usato nessuno.', revealCondition: 'Ask about past tools', resolutionCondition: 'Explain simplicity', severity: 'high' },
        ],
        buyingCriteria: [
          { id: 'bc-1', criterion: 'Facilità adozione PM', importance: 'critical' },
          { id: 'bc-2', criterion: 'Visibilità real-time COO', importance: 'critical' },
        ],
        dealBreakers: ['Richiede formazione > 2 giorni'],
      },
      allowedOutcomes: ['schedule_demo', 'schedule_follow_up', 'send_information', 'no_next_step'],
      guardrails: {
        doNotRevealHiddenObjectionsDirectly: true,
        requireCandidateDiscoveryBeforeRevealingObjections: true,
        preventEasyAgreement: true,
        stayInPersona: true,
        refuseOutOfScenarioRequests: true,
      },
      scoringRubric: [
        { key: 'discovery_depth', label: 'Discovery depth', maxScore: 40, description: 'Did candidate uncover real pain?' },
        { key: 'no_early_pitch', label: 'No early pitch', maxScore: 30, description: 'Avoided premature product presentation?' },
        { key: 'next_step', label: 'Concrete next step', maxScore: 30, description: 'Agreed on next step?' },
      ],
    },
  });

  // Phase 4 - AE Handoff
  await addStep({
    type: 'free_text',
    title: 'Handoff to Account Executive',
    instructions: 'Scrivi un recap per l\'AE (max 150 parole): azienda, problema, urgenza, decision maker, fit, next step.',
    timeLimitSeconds: 300,
    config: {
      prompt: 'Scrivi il tuo AE Handoff (max 150 parole).\nStruttura: Azienda → Problema → Urgenza → Decision Maker → Fit → Next Step',
      minWords: 30,
      maxWords: 200,
      expectedSignals: ['company name', 'pain point', 'urgency', 'decision maker', 'next step'],
      redFlags: ['no next step', 'no pain mentioned'],
      rubric: [
        { key: 'completeness', label: 'Completeness', maxScore: 50, description: 'Covers all required fields' },
        { key: 'actionability', label: 'Actionability', maxScore: 50, description: 'AE can act on this immediately' },
      ],
    },
  });

  // Phase 5 - Dynamic events
  await addStep({
    type: 'notification_reaction',
    title: 'Dynamic Startup Environment',
    instructions: 'Sono arrivate 3 notifiche. Decidi come gestire ciascuna.',
    timeLimitSeconds: 240,
    config: {
      scenarioContext: 'Sono le 11:30. Hai finito la call con Roberto. Arrivano 3 notifiche.',
      taskPrompt: 'Per ogni notifica scegli l\'azione più appropriata e scrivi la risposta se necessario.',
      allowedActions: ['reply', 'schedule_followup', 'escalate', 'ignore'],
      notifications: [
        {
          id: 'n1', channel: 'email', senderName: 'Chiara Ferretti', senderRole: 'CEO, Ferretti Costruzioni',
          timestampOffsetMinutes: 0,
          message: 'Avete integrazione con SAP? La nostra implementazione parte tra 3 settimane.',
          hiddenUrgency: 90, hiddenImportance: 85,
          expectedActionTypes: ['reply'],
          hiddenRationale: 'High urgency deadline = immediate reply',
        },
        {
          id: 'n2', channel: 'slack', senderName: 'Giulia Ferrari', senderRole: 'Sales Manager',
          timestampOffsetMinutes: 5,
          message: 'Come sta andando? Update veloce sulla morning session?',
          hiddenUrgency: 75, hiddenImportance: 70,
          expectedActionTypes: ['reply'],
          hiddenRationale: 'Manager check-in = reply',
        },
        {
          id: 'n3', channel: 'email', senderName: 'Newsletter SaaS Weekly', senderRole: 'Newsletter',
          timestampOffsetMinutes: 10,
          message: 'Top 10 SaaS Growth Hacks this week...',
          hiddenUrgency: 5, hiddenImportance: 10,
          expectedActionTypes: ['ignore', 'schedule_followup'],
          hiddenRationale: 'Newsletter = ignore',
        },
      ],
      scoringWeights: { actionChoice: 0.50, prioritization: 0.20, communication: 0.20, escalationJudgment: 0.10 },
    },
  });

  // Phase 6 - Learning Moment
  await addStep({
    type: 'free_text',
    title: 'Learning Moment — Manager Feedback',
    instructions: 'Il tuo manager ha osservato la discovery call. Leggi il suo feedback e scrivi come miglioreresti.',
    timeLimitSeconds: 240,
    config: {
      prompt: 'Il tuo manager ti ha detto:\n\n"Hai fatto buone domande. Ma hai presentato il prodotto al minuto 8, prima di scoprire il budget e il decision maker. Cosa faresti diversamente nella prossima call?"\n\nRispondi con almeno 3 azioni concrete.',
      minWords: 30,
      expectedSignals: ['acknowledges feedback', 'proposes concrete changes', 'mentions qualification framework'],
      redFlags: ['defensive', 'vague', 'fewer than 3 improvements'],
      rubric: [
        { key: 'acceptance', label: 'Feedback acceptance', maxScore: 30, description: 'Non-defensive acknowledgment' },
        { key: 'specificity', label: 'Concrete improvements', maxScore: 70, description: 'At least 3 actionable changes' },
      ],
    },
  });

  // Phase 7 - Builder Mindset
  await addStep({
    type: 'free_text',
    title: 'Builder Mindset — Process Improvement',
    instructions: 'Proponi almeno 3 miglioramenti concreti al processo SDR che implementeresti subito.',
    timeLimitSeconds: 300,
    config: {
      prompt: 'Dopo questa giornata hai visto:\n• CRM con dati incompleti e nessun lead score\n• 60% dei lead non ricontattati dopo il 1° tentativo\n• Discovery script senza domande su urgenza/timing\n\nProponi 3+ miglioramenti concreti (cosa, perché, come misuri).',
      minWords: 60,
      expectedSignals: ['at least 3 improvements', 'mentions measurement', 'process thinking', 'CRM improvement'],
      redFlags: ['fewer than 3', 'no measurement', 'vague suggestions'],
      rubric: [
        { key: 'quantity', label: 'Min 3 improvements', maxScore: 20, description: 'At least 3 distinct proposals' },
        { key: 'impact', label: 'Business impact', maxScore: 40, description: 'Connects to measurable outcomes' },
        { key: 'originality', label: 'Builder mindset', maxScore: 40, description: 'Shows initiative and systems thinking' },
      ],
    },
  });

  // Phase 8 - Manager Review
  await addStep({
    type: 'free_text',
    title: 'Manager Review — Final 1:1',
    instructions: 'Rispondi alle 4 domande finali del tuo manager con onestà e riflessione.',
    timeLimitSeconds: 300,
    config: {
      prompt: 'Il tuo manager Giulia ti fa 4 domande finali:\n\n1. Perché hai scelto Roberto come lead prioritario?\n2. Qual è stato il momento più difficile di oggi?\n3. Quale errore hai commesso e cosa cambieresti?\n4. Quale lead ritieni più promettente nel lungo termine e perché?',
      minWords: 80,
      expectedSignals: ['answers all 4 questions', 'shows self-awareness', 'identifies real mistake', 'strategic lead analysis'],
      redFlags: ['skips questions', 'claims no mistakes', 'vague answers'],
      rubric: [
        { key: 'reasoning', label: 'Quality of reasoning', maxScore: 25, description: 'Data-driven decisions' },
        { key: 'self_awareness', label: 'Self-awareness', maxScore: 35, description: 'Genuine reflection on mistakes' },
        { key: 'ownership', label: 'Ownership', maxScore: 25, description: 'Takes responsibility' },
        { key: 'strategy', label: 'Strategic thinking', maxScore: 15, description: 'Beyond tactical execution' },
      ],
    },
  });

  log('✓ All 8 steps created');

  // Publish simulation
  await apiFetch('POST', `/api/simulations/${simId}/publish`, {}, token);
  log('✓ Simulation published');

  // Publish job
  await apiFetch('POST', `/api/jobs/${job.id}/publish`, {}, token);
  log('✓ Job published');

  // Invite test candidate
  const invite = await apiFetch('POST', `/api/jobs/${job.id}/candidates/invite`, {
    email: 'sofia.conti@test.com',
    name: 'Sofia Conti',
  }, token);
  const appToken = invite.applicationToken ?? invite.application?.applicationToken ?? invite.application?.id;
  const applyUrl = `${WEB}/apply/${appToken}`;
  log(`✓ Candidate invited. Apply URL: ${applyUrl}`);
  return applyUrl;
}

// ── Browser helpers ──────────────────────────────────────────────────────────

async function clickButton(selector: string, timeout = 8000) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector);
}

async function clickButtonByText(text: string, timeout = 8000) {
  await page.waitForFunction(
    (t: string) => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent?.includes(t) && !(b as HTMLButtonElement).disabled);
    },
    { timeout },
    text
  );
  await page.evaluate((t: string) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes(t) && !(b as HTMLButtonElement).disabled);
    if (btn) (btn as HTMLButtonElement).click();
  }, text);
}

async function typeInto(selector: string, text: string, timeout = 8000) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text, { delay: 20 });
}

async function waitForURL(pattern: RegExp, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (!pattern.test(page.url())) {
    if (Date.now() > deadline) throw new Error(`URL never matched ${pattern}, got: ${page.url()}`);
    await wait(300);
  }
  log(`  URL: ${page.url()}`);
}

// ── Candidate answer helpers ─────────────────────────────────────────────────

async function handleWelcomeStep() {
  log('  → Welcome step: reading for 6 seconds...');
  await wait(6000);
  await clickButtonByText('Continue');
}

async function handleCrmStep() {
  log('  → CRM Prioritization: reordering leads + adding explanation...');
  await wait(1000);
  // The records start in their default order. Move lead-1 to top (it may already be there)
  // Just type the explanation — the default order may already be acceptable
  await page.waitForSelector('textarea', { timeout: 5000 });
  await page.click('textarea');
  await page.type('textarea',
    'Ho prioritizzato Roberto Esposito (Impresa Edile Esposito) perché ha già richiesto una demo con urgenza esplicita e rappresenta il ticket più alto (45k€). Luca Moretti segue perché mostra alta engagement oggi (×5 sulla pagina features). Maria Greco ha risposto "non ora" quindi bassa priorità. Valentina Costa ha visitato solo la homepage 48h fa — contatto secondario.',
    { delay: 15 }
  );
  await wait(500);
  await clickButtonByText('Submit Step');
}

async function handleSimulatedCallStep() {
  log('  → Simulated Call: starting → waiting 8s → ending...');
  await clickButtonByText('Start Call', 10000);
  await wait(8000);
  await clickButtonByText('End Call');
  await wait(1000);
  await clickButtonByText('Submit Step');
}

async function handleFreeTextStep(text: string) {
  log(`  → Free text: typing ${text.length} chars...`);
  await page.waitForSelector('textarea', { timeout: 8000 });
  await page.click('textarea');
  await page.type('textarea', text, { delay: 10 });
  await wait(500);
  await clickButtonByText('Submit Step');
}

async function handleNotificationStep() {
  log('  → Notification Reaction: selecting actions...');
  await wait(1000);

  // For each notification container, find and click the appropriate action
  const notifContainers = await page.$$('.border.border-gray-200.rounded-xl');
  let containerIdx = 0;
  for (const container of notifContainers) {
    const buttons = await container.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate((el: Element) => el.textContent?.trim() ?? '');
      // Pick reply for most, ignore for newsletter (3rd notification)
      const targetAction = containerIdx === 2 ? 'ignore' : 'reply';
      if (text === targetAction) {
        await btn.click();
        await wait(400);
        break;
      }
    }
    containerIdx++;
  }

  // Fill in reply textareas that appeared
  const textareas = await page.$$('textarea');
  const replies = [
    'Ciao Chiara, certo! Ti mando subito la documentazione tecnica sull\'integrazione SAP. Ti propongo anche una call tecnica questa settimana — quando sei disponibile?',
    'Ciao Giulia! Mattinata produttiva: discovery call con Esposito (ottima, urgenza confermata), CRM prioritizzato, handoff scritto. Ti racconto in call!',
  ];
  let ri = 0;
  for (const ta of textareas) {
    if (ri < replies.length) {
      await ta.click();
      await ta.type(replies[ri], { delay: 10 });
      ri++;
    }
  }

  await wait(500);
  await clickButtonByText('Submit Step');
}

// ── Main flow ────────────────────────────────────────────────────────────────

async function run() {
  const applyUrl = await ensureSimulationAndGetApplyUrl();

  // Ensure screenshots dir exists
  const { mkdirSync } = await import('fs');
  mkdirSync('scripts/screenshots', { recursive: true });

  log('\n=== Launching Puppeteer ===');
  browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-web-security'],
    defaultViewport: { width: 1280, height: 900 },
  });
  page = await browser.newPage();

  // ── Apply / Pre-sim briefing ──────────────────────────────────────────────
  log(`Navigating to apply URL...`);
  await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for React hydration — look for the Begin Simulation button
  await page.waitForFunction(
    () => document.querySelector('button') !== null && !document.body.textContent?.includes('Loading...'),
    { timeout: 20000 }
  );

  await screenshot('01-apply');
  log(`  Page loaded: ${page.url()}`);

  // Click "Begin Simulation"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('Begin') || b.textContent?.includes('Start') || b.textContent?.includes('Inizia'));
    if (btn) (btn as HTMLButtonElement).click();
  });

  // Wait for navigation to session overview
  await page.waitForFunction(() => window.location.href.includes('/simulation/'), { timeout: 15000 });
  await wait(2000);
  await screenshot('02-session-started');
  log(`  Session started. URL: ${page.url()}`);

  // ── Simulation steps loop ─────────────────────────────────────────────────
  let stepCount = 0;
  const MAX_STEPS = 12;

  while (stepCount < MAX_STEPS) {
    const url = page.url();

    // Check if we're on a step page
    if (url.includes('/simulation/') && url.includes('/step/')) {
      stepCount++;
      // Wait for page to load fully
      await page.waitForFunction(
        () => !document.body.textContent?.includes('Loading...'),
        { timeout: 10000 }
      ).catch(() => {});
      await wait(1000);
      await screenshot(`step-${stepCount.toString().padStart(2,'0')}`);

      // Detect step type from page
      const stepType = await page.evaluate(() => {
        const els = document.querySelectorAll('p');
        for (const el of els) {
          const t = el.textContent?.toLowerCase() ?? '';
          if (t.includes('welcome') || t.includes('crm') || t.includes('prioritization') || t.includes('simulated call') || t.includes('notification') || t.includes('free text') || t.includes('onboarding')) return el.textContent?.trim() ?? '';
        }
        return '';
      });
      log(`\nStep ${stepCount} — type: "${stepType}" — ${url}`);

      try {
        if (stepType.includes('welcome')) {
          await handleWelcomeStep();
        } else if (stepType.includes('crm') || stepType.includes('prioritization')) {
          await handleCrmStep();
        } else if (stepType.includes('simulated call')) {
          await handleSimulatedCallStep();
        } else if (stepType.includes('notification')) {
          await handleNotificationStep();
        } else if (stepType.includes('free text')) {
          // Determine which phase by step count
          let answer = '';
          if (stepCount === 4) {
            answer = `AE Handoff — Esposito SpA\n\nAzienda: Impresa Edile Esposito SpA (350 dip., 25 cantieri). COO: Roberto Esposito.\n\nProblema: Nessuna visibilità real-time sulla pipeline commerciale. I PM mandano aggiornamenti via WhatsApp. Hanno perso 2 contratti il mese scorso per mancato follow-up.\n\nUrgenza: Alta. CdA tra 6 settimane dove devono presentare piano di digitalizzazione.\n\nFit: Alto. ICP perfetto. Budget stimato 30-50k€ annui.\n\nNext step: Demo tecnica mercoledì 14:00 con Roberto + IT Manager. Inviare caso studio costruzioni prima della call.`;
          } else if (stepCount === 6) {
            answer = `Grazie per il feedback, Giulia. Hai ragione — ho presentato Pillar troppo presto.\n\nLa prossima call farò diversamente:\n\n1. Seguirò il framework BANT completo prima di menzionare il prodotto: Budget → Authority → Need → Timing. Non parlerò della soluzione finché non avrò esplorato tutti e 4.\n\n2. Userò domande più aperte per scoprire urgenza e budget: "Cosa succede se non risolvete questo problema entro fine anno?" e "Avete già un budget dedicato a questo progetto?"\n\n3. Prenderò note strutturate durante la call con template BANT per non dimenticare domande chiave.\n\nL'errore principale è stato che ho voluto dimostrare di conoscere il prodotto prima di dimostrare di capire il loro problema.`;
          } else if (stepCount === 7) {
            answer = `Dopo questa giornata propongo 3 miglioramenti immediati:\n\n1. Lead Scoring Automatico nel CRM\nCosa: Aggiungere un campo "Intent Score" (0-100) calcolato automaticamente da visite pagina, download, email aperte.\nPerché: Oggi ho speso 10 minuti a valutare 4 lead manualmente. Con 20+ lead al giorno, questo non è scalabile.\nMisura: Tempo medio di prioritizzazione lead (target: da 10min a <2min per sessione).\n\n2. Follow-up Automatico a 48h\nCosa: Sequenza email automatica per lead che non rispondono entro 48h dall'invito demo.\nPerché: 60% dei lead non ricontattati = opportunità perse per dimenticanza.\nMisura: Tasso di conversion lead→demo (target: +15% in 30 giorni).\n\n3. Aggiornamento Script Discovery con Framework BANT\nCosa: Aggiungere sezione esplicita per urgenza ("Cosa succede se non risolvete entro fine anno?") e budget ("Avete già allocato risorse per questo?").\nPerché: Ho presentato il prodotto troppo presto perché lo script non guida le domande di qualificazione.\nMisura: Accuracy del CRM handoff valutata dall'AE (target: >85% handoff completi).`;
          } else if (stepCount === 8) {
            answer = `1. Ho scelto Roberto Esposito come priorità perché aveva 3 segnali convergenti: richiesta demo esplicita, urgenza dichiarata ("problema pipeline"), e dimensione azienda (350 dip. = ACV più alto). Luca Moretti aveva più engagement ma nessuna urgenza dichiarata.\n\n2. Il momento più difficile è stato la discovery call: Roberto è diretto e tende a chiudere le domande con risposte brevi. Ho dovuto resistere alla tentazione di riempire i silenzi con feature del prodotto.\n\n3. L'errore più grande: ho menzionato Pillar al minuto 8 senza aver ancora qualificato il budget. Ho bruciato il momento di curiosità naturale del prospect. La prossima volta completo BANT prima di aprire la presentazione.\n\n4. Nel lungo termine il lead più promettente è Ricci Group SpA (500+ dip.) per ACV potenziale alto. Anche se è venuto da un'ad (intent più basso), la dimensione giustifica un percorso di nurturing più lungo con contenuto educativo specifico per enterprise.`;
          }
          await handleFreeTextStep(answer || 'Test answer: completing this step in the SDR simulation flow.');
        } else {
          log(`  ⚠ Unknown step type "${stepType}" — trying generic submit after 3s`);
          await wait(3000);
          await clickButtonByText('Submit Step').catch(() => clickButtonByText('Continue').catch(() => {}));
        }
      } catch (e: any) {
        err(`Step ${stepCount} error: ${e.message}`);
        await screenshot(`error-step-${stepCount}`);
      }

      // Wait for navigation to next step or completion
      await wait(2000);
      continue;
    }

    // Check if we're on session overview page
    if (url.includes('/simulation/') && !url.includes('/step/') && !url.includes('/completed')) {
      log(`Session overview page. Looking for next step link...`);
      await wait(2000);
      await screenshot(`overview-${stepCount}`);
      // Find step link and click it
      const clicked = await page.evaluate(() => {
        const a = document.querySelector('a[href*="/step/"]') as HTMLAnchorElement | null;
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Continue') || b.textContent?.includes('Start'));
        if (a) { a.click(); return true; }
        if (btn) { (btn as HTMLButtonElement).click(); return true; }
        return false;
      });
      if (!clicked) { log(`  No navigation found on overview page`); break; }
      await wait(2000);
      continue;
    }

    // Check if we've reached completion
    if (url.includes('/completed')) {
      await screenshot('final-completed');
      log('\n🎉 Simulation completed successfully!');
      break;
    }

    // If we're still on apply page, try to start
    if (url.includes('/apply/')) {
      log('Still on apply page, waiting...');
      await wait(3000);
      const btn = await page.$('button');
      if (btn) await btn.click();
      await wait(2000);
      continue;
    }

    log(`Unknown URL state: ${url}`);
    await wait(3000);
    stepCount++;

    if (stepCount >= MAX_STEPS) {
      log('Max steps reached — exiting');
      break;
    }
  }

  await screenshot('final');
  log(`\nAll screenshots saved to scripts/screenshots/`);
  log(`Final URL: ${page.url()}`);

  await browser.close();
}

run().catch(async (e) => {
  err(e.message);
  if (page) await screenshot('fatal-error').catch(() => {});
  if (browser) await browser.close().catch(() => {});
  process.exit(1);
});
