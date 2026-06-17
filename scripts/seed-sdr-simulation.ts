/**
 * Creates the full "Alpha x Pillar - SDR Intern" simulation via the API.
 * Run: npx tsx scripts/seed-sdr-simulation.ts
 *
 * Outputs: APPLICATION_URL that the Puppeteer script uses.
 */

const BASE = process.env.API_URL || 'https://api-production-c586.up.railway.app';

async function api(method: string, path: string, body?: object, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { rawText: text }; }
  if (!res.ok) {
    console.error(`API ${method} ${path} → ${res.status}`, data);
    throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('=== Seeding SDR Intern Simulation ===\n');

  // 1. Register / login as Pillar admin
  let token: string;
  let orgId: string;
  try {
    const reg = await api('POST', '/api/register', {
      companyName: 'Pillar',
      name: 'Lorenzo Rossi',
      email: 'admin@pillar-test.com',
      password: 'Pillar2024!',
    });
    token = reg.token;
    console.log('✓ Registered as Pillar admin');
  } catch {
    // Already exists — login
    const login = await api('POST', '/api/login', {
      email: 'admin@pillar-test.com',
      password: 'Pillar2024!',
    });
    token = login.token;
    console.log('✓ Logged in as Pillar admin');
  }

  const me = await api('GET', '/api/me', undefined, token);
  orgId = me.organizationId;
  console.log(`  org: ${orgId}`);

  // 2. Create Job Posting
  const job = await api('POST', '/api/jobs', {
    title: 'SDR Intern',
    description: `Pillar è una startup B2B SaaS in forte crescita che aiuta le aziende a gestire la propria pipeline commerciale. Stiamo cercando un SDR Intern con mentalità da founder: proattivo, curioso, con voglia di imparare e fare. Entrerai fin dal primo giorno in un contesto dinamico e meritocratico, con responsabilità reali e feedback costante.`,
    department: 'Sales',
    location: 'Milano, Italy',
    remotePolicy: 'hybrid',
    seniority: 'intern',
    employmentType: 'internship',
  }, token);
  console.log(`✓ Created job: ${job.id} — "${job.title}"`);

  // 3. Create Simulation
  const sim = await api('POST', `/api/jobs/${job.id}/simulation`, {
    title: 'SDR Intern Day-in-the-Life',
    description: 'Simulazione completa della giornata tipo di un SDR Intern in Pillar. 8 fasi che testano business judgement, discovery, qualificazione, gestione del tempo e mentalità builder.',
    estimatedDurationMinutes: 45,
  }, token);
  console.log(`✓ Created simulation: ${sim.id}`);

  const simId = sim.id;

  // Helper to add a step
  async function addStep(stepData: object) {
    return api('POST', `/api/simulations/${simId}/steps`, stepData, token);
  }

  // === FASE 1: Welcome & Onboarding ===
  const step1 = await addStep({
    type: 'welcome',
    title: 'Welcome to Pillar — Day 1',
    instructions: 'Prima di iniziare la simulazione, prenditi un momento per leggere il messaggio del Founder e capire il contesto in cui entrerai.',
    timeLimitSeconds: null,
    config: {
      founderName: 'Marco Pellegrini',
      founderRole: 'Founder & CEO, Pillar',
      founderMessage: `Ciao, e benvenuto in Pillar!\n\nSono Marco, il Founder. Sono contento che tu sia qui oggi.\n\nPillar è una startup B2B SaaS che aiuta le PMI italiane a gestire la loro pipeline commerciale in modo più strutturato. Siamo una squadra piccola e ambiziosa: ogni persona ha un impatto diretto sui risultati.\n\nQuello che stai per vivere è una simulazione della tua prima giornata come SDR Intern. Non esiste una risposta "corretta" — mi interessa vedere come ragioni, come prendi decisioni sotto pressione, e se hai la mentalità giusta per crescere in un ambiente startup.\n\nHai 45 minuti. Buona fortuna!`,
      slackMessage: {
        sender: 'Giulia Ferrari',
        role: 'Sales Manager',
        message: 'Ciao! Benvenuto nel team 🎉 Oggi voglio capire come ragioni. Non mi interessa che tu sappia già fare tutto. Mi interessa vedere come affronti problemi reali. Cominciamo!',
      },
      minReadSeconds: 20,
    },
  });
  console.log(`  ✓ Step 1: Welcome (${step1.id})`);

  // === FASE 2: Inbox Prioritization (CRM) ===
  const step2 = await addStep({
    type: 'crm_prioritization',
    title: 'Inbox Prioritization — CRM',
    instructions: 'Hai 8 lead nel CRM. Le informazioni sono volutamente incomplete. Decidi quale lead contattare per primo e perché. Non esiste una risposta corretta: dimostra il tuo business judgement.',
    timeLimitSeconds: 600,
    config: {
      scenarioContext: 'Sono le 9:00 di mattina. Hai appena aperto il CRM e vedi 8 lead inbound arrivati nelle ultime 24 ore. Devi decidere in quale ordine contattarli per massimizzare il valore generato nella giornata.',
      taskPrompt: 'Ordina i lead dal più al meno prioritario. Poi spiega la tua logica di prioritizzazione.',
      records: [
        {
          id: 'lead-1',
          displayName: 'Alessandro Bianchi',
          company: 'Costruzioni Bianchi Srl',
          value: 18000,
          stage: 'New Inbound',
          lastActivityAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          healthScore: 85,
          notes: ['Ha visitato la pagina pricing 3 volte', 'Ha scaricato il caso studio'],
          visibleSignals: ['Pricing page ×3', 'Case study download', '120 dipendenti', '8 cantieri attivi'],
          hiddenPriorityScore: 95,
          hiddenRationale: 'High intent signals: repeated pricing visits + case study = buying committee active',
        },
        {
          id: 'lead-2',
          displayName: 'Francesca Lombardi',
          company: 'Studio Arch. Lombardi',
          value: 4000,
          stage: 'New Inbound',
          lastActivityAt: new Date(Date.now() - 30 * 3600000).toISOString(),
          healthScore: 40,
          notes: ['Ha compilato il form "Contattami"'],
          visibleSignals: ['Contact form', '5 dipendenti', '1 cantiere'],
          hiddenPriorityScore: 30,
          hiddenRationale: 'Small company, low ACV potential, old lead',
        },
        {
          id: 'lead-3',
          displayName: 'Roberto Esposito',
          company: 'Impresa Edile Esposito SpA',
          value: 45000,
          stage: 'New Inbound',
          lastActivityAt: new Date(Date.now() - 1 * 3600000).toISOString(),
          healthScore: 70,
          notes: ['Demo richiesta tramite sito', 'Ha menzionato "problema urgente con la pipeline"'],
          visibleSignals: ['Demo requested', '350 dipendenti', '25 cantieri', 'Urgency signal'],
          hiddenPriorityScore: 90,
          hiddenRationale: 'Large company + demo request + urgency = top priority despite lower engagement score',
        },
        {
          id: 'lead-4',
          displayName: 'Maria Greco',
          company: 'Greco & Partners Srl',
          value: 12000,
          stage: 'Contacted',
          lastActivityAt: new Date(Date.now() - 5 * 3600000).toISOString(),
          healthScore: 60,
          notes: ['Ha risposto all\'email iniziale con "interessante, ma non ora"'],
          visibleSignals: ['Replied to email', '45 dipendenti', '3 cantieri', 'Not urgent'],
          hiddenPriorityScore: 45,
          hiddenRationale: 'Mid-size but explicit "not now" = low urgency, deprioritize',
        },
        {
          id: 'lead-5',
          displayName: 'Luca Moretti',
          company: 'Moretti Costruzioni',
          value: 22000,
          stage: 'New Inbound',
          lastActivityAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
          healthScore: 75,
          notes: ['Ha visitato la pagina features 5 volte oggi', 'Ha guardato il video demo'],
          visibleSignals: ['Features page ×5 TODAY', 'Demo video watched', '80 dipendenti', '6 cantieri'],
          hiddenPriorityScore: 80,
          hiddenRationale: 'High recency + feature research = active evaluation phase',
        },
        {
          id: 'lead-6',
          displayName: 'Valentina Costa',
          company: 'Costa Impianti Srl',
          value: 8000,
          stage: 'New Inbound',
          lastActivityAt: new Date(Date.now() - 48 * 3600000).toISOString(),
          healthScore: 35,
          notes: ['Solo homepage visit', '2 giorni fa'],
          visibleSignals: ['Homepage only', '20 dipendenti', '2 cantieri', '48h ago'],
          hiddenPriorityScore: 20,
          hiddenRationale: 'Low intent, old visit, small company',
        },
        {
          id: 'lead-7',
          displayName: 'Giuseppe Ricci',
          company: 'Ricci Group SpA',
          value: 60000,
          stage: 'New Inbound',
          lastActivityAt: new Date(Date.now() - 3 * 3600000).toISOString(),
          healthScore: 55,
          notes: ['Competitor attuale: software legacy', 'Visita da LinkedIn ad'],
          visibleSignals: ['Enterprise size', '500+ dipendenti', 'From LinkedIn ad', 'Current competitor mentioned'],
          hiddenPriorityScore: 65,
          hiddenRationale: 'High ACV but came from paid ad = lower organic intent, worth calling but after demo requests',
        },
        {
          id: 'lead-8',
          displayName: 'Chiara Ferretti',
          company: 'Ferretti Costruzioni Srl',
          value: 15000,
          stage: 'New Inbound',
          lastActivityAt: new Date(Date.now() - 4 * 3600000).toISOString(),
          healthScore: 65,
          notes: ['Ha inviato email chiedendo "come funziona l\'integrazione con SAP"'],
          visibleSignals: ['SAP integration question', '90 dipendenti', '7 cantieri', 'Technical buyer signal'],
          hiddenPriorityScore: 70,
          hiddenRationale: 'SAP question indicates technical evaluation = real intent, likely needs technical call',
        },
      ],
      maxRankedItems: 8,
      requiredExplanation: true,
      expectedTopRecordIds: ['lead-3', 'lead-1', 'lead-5'],
      scoringWeights: {
        topChoiceAccuracy: 0.35,
        rankingQuality: 0.30,
        explanationQuality: 0.25,
        riskAwareness: 0.10,
      },
    },
  });
  console.log(`  ✓ Step 2: CRM Prioritization (${step2.id})`);

  // === FASE 3: Discovery Call ===
  const step3 = await addStep({
    type: 'simulated_call',
    title: 'Discovery Call — Roberto Esposito',
    instructions: 'Roberto Esposito di Impresa Edile Esposito SpA ha richiesto una demo. Prima di mostrare il prodotto, conduci una discovery call per capire il suo contesto, i suoi problemi e la sua urgenza. Non presentare il prodotto prima di aver capito il suo problema.',
    timeLimitSeconds: 900,
    config: {
      callType: 'sales_discovery',
      title: 'Discovery Call con Roberto Esposito — COO di Impresa Edile Esposito SpA',
      publicCandidateBrief: 'Stai per chiamare Roberto Esposito, COO di Impresa Edile Esposito SpA (350 dipendenti, 25 cantieri attivi). Ha compilato il form richiedendo una demo e ha menzionato "un problema urgente con la pipeline". Il tuo obiettivo: capire il suo vero problema prima di parlare del prodotto.',
      estimatedDurationSeconds: 480,
      maxDurationSeconds: 900,
      aiPersona: {
        name: 'Roberto Esposito',
        role: 'COO',
        company: 'Impresa Edile Esposito SpA',
        personality: 'Diretto, pragmatico, scettico verso i software ma aperto se le domande sono giuste. Non ama perdere tempo.',
        communicationStyle: 'Conciso, preferisce dati a promesse, risponde brevemente se non incuriosito',
        baselineMood: 'busy',
      },
      publicBusinessContext: {
        candidateCompany: 'Pillar',
        productOrService: 'Pipeline management SaaS per PMI edilizie',
        valueProposition: 'Visibilità real-time sulla pipeline commerciale, riduzione del chaos operativo',
        knownContext: ['Ha richiesto una demo', 'Ha menzionato un problema urgente con la pipeline', '350 dipendenti, 25 cantieri attivi'],
      },
      hiddenBuyerState: {
        initialInterestLevel: 55,
        initialTrustLevel: 35,
        initialUrgencyLevel: 70,
        hiddenObjections: [
          {
            id: 'obj-1',
            type: 'trust',
            description: 'Ho già provato un CRM 2 anni fa — non lo ha usato nessuno del team.',
            revealCondition: 'Candidate asks about past experience with similar tools',
            resolutionCondition: 'Candidate explains change management support or simplicity',
            severity: 'high',
          },
          {
            id: 'obj-2',
            type: 'internal_resistance',
            description: 'I miei PM preferiscono WhatsApp. Non voglio fare una guerra interna.',
            revealCondition: 'Candidate asks about team adoption or current tools',
            resolutionCondition: 'Candidate shows empathy and proposes a phased approach',
            severity: 'medium',
          },
        ],
        buyingCriteria: [
          { id: 'bc-1', criterion: 'Facilità di adozione per i PM', importance: 'critical' },
          { id: 'bc-2', criterion: 'Integrazione con strumenti esistenti', importance: 'high' },
          { id: 'bc-3', criterion: 'Visibilità real-time per il COO', importance: 'critical' },
        ],
        dealBreakers: ['Richiede formazione > 2 giorni', 'Non funziona su mobile'],
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
        { key: 'discovery_depth', label: 'Discovery depth', maxScore: 30, description: 'Did candidate uncover the real pain (WhatsApp chaos, visibility gap)?' },
        { key: 'bant_qualification', label: 'BANT qualification', maxScore: 25, description: 'Did candidate qualify Budget, Authority, Need, Timeline?' },
        { key: 'no_early_pitch', label: 'Avoided premature pitch', maxScore: 20, description: 'Did candidate avoid presenting the product before understanding the problem?' },
        { key: 'question_quality', label: 'Question quality', maxScore: 15, description: 'Were questions open-ended and follow-up driven?' },
        { key: 'next_step', label: 'Concrete next step', maxScore: 10, description: 'Did candidate propose and agree on a concrete next step?' },
      ],
    },
  });
  console.log(`  ✓ Step 3: Discovery Call (${step3.id})`);

  // === FASE 4: Handoff to AE ===
  const step4 = await addStep({
    type: 'free_text',
    title: 'Handoff to Account Executive',
    instructions: 'Scrivi un recap per l\'Account Executive (massimo 150 parole). L\'AE deve poter condurre una demo efficace leggendo solo questo documento. Includi: azienda, problema principale, urgenza, decision maker, fit, prossimi passi concordati.',
    timeLimitSeconds: 600,
    config: {
      prompt: 'Scrivi il tuo AE Handoff (max 150 parole). Struttura: Azienda → Problema → Urgenza → Decision Maker → Fit → Next Step',
      minWords: 30,
      maxWords: 200,
      expectedSignals: [
        'mentions company name or size',
        'identifies the core pain (visibility, pipeline management)',
        'mentions urgency (board meeting, end of quarter)',
        'names the decision maker (Roberto, COO)',
        'proposes a concrete next step',
        'assesses product fit',
      ],
      redFlags: [
        'no mention of pain or problem',
        'no next step defined',
        'only generic information without specifics from the call',
        'word count exceeds 200',
      ],
      rubric: [
        { key: 'clarity', label: 'Clarity & conciseness', maxScore: 25, description: 'Is the handoff readable and clear for an AE who has no prior context?' },
        { key: 'completeness', label: 'Completeness of key fields', maxScore: 35, description: 'Does it cover company, pain, urgency, DM, fit, and next step?' },
        { key: 'specificity', label: 'Specificity from the call', maxScore: 25, description: 'Does it include concrete details discovered during the call?' },
        { key: 'actionability', label: 'Actionability', maxScore: 15, description: 'Can an AE immediately prepare a demo from this?' },
      ],
    },
  });
  console.log(`  ✓ Step 4: AE Handoff (${step4.id})`);

  // === FASE 5: Dynamic Startup Environment ===
  const step5 = await addStep({
    type: 'notification_reaction',
    title: 'Dynamic Startup Environment',
    instructions: 'Nel frattempo sono arrivate 5 notifiche. Decidi come gestire ciascuna: rispondere subito, rimandare, escalare al manager, o ignorare. Per ogni risposta che invii, scrivila.',
    timeLimitSeconds: 480,
    config: {
      scenarioContext: 'Sono le 11:30. Hai appena finito la discovery call con Roberto. Mentre aggiorni il CRM, arrivano 5 notifiche. Hai ancora 3 ore di giornata e due call previste nel pomeriggio.',
      taskPrompt: 'Per ogni notifica, scegli l\'azione più appropriata e scrivi la tua risposta se decidi di rispondere.',
      allowedActions: ['reply', 'schedule_followup', 'escalate', 'ignore'],
      notifications: [
        {
          id: 'notif-1',
          channel: 'email',
          senderName: 'Chiara Ferretti',
          senderRole: 'CEO, Ferretti Costruzioni',
          timestampOffsetMinutes: 0,
          message: 'Ciao, ho visto che avete un\'integrazione con SAP. Potete mandarmi la documentazione tecnica? La nostra implementazione SAP parte tra 3 settimane.',
          hiddenUrgency: 90,
          hiddenImportance: 85,
          expectedActionTypes: ['reply'],
          hiddenRationale: 'High urgency + technical question with deadline = immediate reply, send docs, book technical call',
        },
        {
          id: 'notif-2',
          channel: 'slack',
          senderName: 'Giulia Ferrari',
          senderRole: 'Sales Manager',
          timestampOffsetMinutes: 5,
          message: 'Come sta andando? Riesci a darmi un update veloce sulla morning session?',
          hiddenUrgency: 75,
          hiddenImportance: 70,
          expectedActionTypes: ['reply'],
          hiddenRationale: 'Manager check-in = immediate brief reply to maintain trust',
        },
        {
          id: 'notif-3',
          channel: 'email',
          senderName: 'Alessandro Bianchi',
          senderRole: 'Titolare, Costruzioni Bianchi',
          timestampOffsetMinutes: 10,
          message: 'Ciao, mi avete mandato un\'email la settimana scorsa. Non ho avuto tempo di rispondere. Siete ancora disponibili per una chiamata?',
          hiddenUrgency: 80,
          hiddenImportance: 80,
          expectedActionTypes: ['reply'],
          hiddenRationale: 'Warm inbound re-engaging = immediate reply while interest is fresh',
        },
        {
          id: 'notif-4',
          channel: 'email',
          senderName: 'Newsletter SaaS Weekly',
          senderRole: 'Newsletter',
          timestampOffsetMinutes: 15,
          message: 'Top 10 SaaS Growth Hacks this week — Automation, AI Tools, Outbound Templates...',
          hiddenUrgency: 5,
          hiddenImportance: 10,
          expectedActionTypes: ['ignore', 'schedule_followup'],
          hiddenRationale: 'Newsletter = ignore or save for later, definitely not now',
        },
        {
          id: 'notif-5',
          channel: 'email',
          senderName: 'Valentina Costa',
          senderRole: 'Admin, Costa Impianti',
          timestampOffsetMinutes: 20,
          message: 'Ho visto il vostro sito. Posso avere informazioni sui prezzi?',
          hiddenUrgency: 40,
          hiddenImportance: 50,
          expectedActionTypes: ['reply', 'schedule_followup'],
          hiddenRationale: 'Low-intent inbound = reply with pricing but not critical priority now',
        },
      ],
      scoringWeights: {
        actionChoice: 0.50,
        prioritization: 0.20,
        communication: 0.20,
        escalationJudgment: 0.10,
      },
    },
  });
  console.log(`  ✓ Step 5: Dynamic Notifications (${step5.id})`);

  // === FASE 6: Learning Moment ===
  const step6 = await addStep({
    type: 'free_text',
    title: 'Learning Moment — Manager Feedback',
    instructions: 'Il tuo manager ha osservato come hai gestito la discovery call con Roberto. Leggi il suo feedback e scrivi come affronteresti diversamente la prossima chiamata.',
    timeLimitSeconds: 300,
    config: {
      prompt: `Il tuo manager Giulia ti ha inviato questo feedback:\n\n"Ottima gestione delle prime fasi. Hai fatto buone domande. Però hai presentato Pillar al minuto 8 della call, prima di aver capito il budget e il decision maker. La regola è: non parlare del prodotto prima di aver esplorato tutti e 4 i pilastri BANT (Budget, Authority, Need, Timing).\n\nCosa faresti diversamente nella tua prossima discovery call?"\n\nRispondi con almeno 3 azioni concrete che cambieresti.`,
      minWords: 40,
      expectedSignals: [
        'acknowledges the specific feedback about pitching too early',
        'references BANT or a qualification framework',
        'proposes concrete behavioral changes (not vague)',
        'shows self-awareness without being defensive',
        'demonstrates learning mindset',
      ],
      redFlags: [
        'dismisses or ignores the feedback',
        'vague non-committal answer',
        'less than 3 concrete actions',
        'defensive tone',
      ],
      rubric: [
        { key: 'acceptance', label: 'Feedback acceptance', maxScore: 25, description: 'Does the candidate acknowledge the feedback without defensiveness?' },
        { key: 'specificity', label: 'Specificity of improvement plan', maxScore: 40, description: 'Are the proposed changes concrete and actionable?' },
        { key: 'framework', label: 'Framework application', maxScore: 20, description: 'Does the candidate apply a qualification framework (BANT/MEDDIC/etc.)?' },
        { key: 'growth_mindset', label: 'Growth mindset indicators', maxScore: 15, description: 'Does the response show genuine learning vs. just saying the right things?' },
      ],
    },
  });
  console.log(`  ✓ Step 6: Learning Moment (${step6.id})`);

  // === FASE 7: Builder Mindset ===
  const step7 = await addStep({
    type: 'free_text',
    title: 'Builder Mindset — Process Improvement',
    instructions: 'Hai avuto accesso al CRM, alla pipeline, allo script di discovery e al processo inbound della giornata. Proponi almeno 3 miglioramenti concreti che implementeresti subito per migliorare i risultati del team SDR.',
    timeLimitSeconds: 600,
    config: {
      prompt: `Dopo questa giornata hai avuto visibilità su:\n• CRM con 8 lead (dati incompleti, nessun campo "urgenza")\n• Pipeline: 60% dei lead non vengono ricontattati dopo il primo tentativo\n• Script discovery: non include domande sul timing/urgenza\n• Processo inbound: i lead arrivano senza score di priorità\n\nProponi almeno 3 miglioramenti concreti che implementeresti. Per ognuno specifica: COSA cambi, PERCHÉ, e COME misuri il risultato.`,
      minWords: 80,
      expectedSignals: [
        'at least 3 distinct improvement proposals',
        'each improvement has a specific what/why/how structure',
        'at least one process improvement (not just tactical)',
        'mentions measurable outcomes or KPIs',
        'at least one improvement related to CRM data quality or lead scoring',
        'demonstrates initiative and systems thinking',
      ],
      redFlags: [
        'fewer than 3 improvements',
        'vague suggestions without implementation detail',
        'no mention of measurement or outcomes',
        'only tactical suggestions without strategic thinking',
      ],
      rubric: [
        { key: 'quantity', label: 'Number of improvements (min 3)', maxScore: 15, description: 'Did the candidate propose at least 3 concrete improvements?' },
        { key: 'structure', label: 'Structure (what/why/how)', maxScore: 30, description: 'Are improvements clearly structured with rationale and implementation?' },
        { key: 'impact', label: 'Business impact awareness', maxScore: 30, description: 'Does the candidate connect improvements to business outcomes/KPIs?' },
        { key: 'originality', label: 'Originality & initiative', maxScore: 25, description: 'Does the candidate show genuine builder mindset vs. generic suggestions?' },
      ],
    },
  });
  console.log(`  ✓ Step 7: Builder Mindset (${step7.id})`);

  // === FASE 8: Manager Review (Final 1:1) ===
  const step8 = await addStep({
    type: 'free_text',
    title: 'Manager Review — Final 1:1',
    instructions: 'Momento finale di riflessione con il tuo manager. Rispondi alle sue domande con onestà. Non cercare di dare la risposta "perfetta" — il manager vuole capire come ragioni e se sai riflettere sulle tue decisioni.',
    timeLimitSeconds: 600,
    config: {
      prompt: `Il tuo manager Giulia ti fa 4 domande finali. Rispondi a tutte:\n\n1. **Perché hai scelto Roberto Esposito come lead prioritario dopo il CRM exercise?**\n\n2. **Qual è stato il momento più difficile di oggi e come l'hai gestito?**\n\n3. **Quale errore hai commesso e cosa cambieresti?**\n\n4. **Quale lead della lista ritieni più promettente per il lungo termine e perché?**`,
      minWords: 100,
      expectedSignals: [
        'answers all 4 questions explicitly',
        'shows clear reasoning for lead prioritization (not just intuition)',
        'identifies a genuine difficulty without exaggerating',
        'acknowledges a real mistake with specific self-awareness',
        'has strategic thinking about long-term lead value (ACV, growth potential)',
        'demonstrates ownership mindset throughout',
      ],
      redFlags: [
        'skips one or more questions',
        'claims no mistakes were made',
        'gives purely positive self-assessment without any criticism',
        'reasoning is vague or generic',
      ],
      rubric: [
        { key: 'reasoning', label: 'Quality of reasoning', maxScore: 25, description: 'Are decisions well-reasoned and data-driven?' },
        { key: 'self_awareness', label: 'Self-awareness & honesty', maxScore: 30, description: 'Does the candidate show genuine reflection on mistakes and learnings?' },
        { key: 'ownership', label: 'Ownership mindset', maxScore: 25, description: 'Does the candidate take responsibility without blame-shifting?' },
        { key: 'strategic_thinking', label: 'Strategic thinking', maxScore: 20, description: 'Does the candidate think beyond tactical execution to business outcomes?' },
      ],
    },
  });
  console.log(`  ✓ Step 8: Manager Review (${step8.id})`);

  // 4. Publish simulation
  await api('POST', `/api/simulations/${simId}/publish`, {}, token);
  console.log(`✓ Published simulation`);

  // 5. Publish job
  await api('POST', `/api/jobs/${job.id}/publish`, {}, token);
  console.log(`✓ Published job`);

  // 6. Invite test candidate
  const invite = await api('POST', `/api/jobs/${job.id}/candidates/invite`, {
    email: 'candidato@test.com',
    name: 'Sofia Conti',
  }, token);
  console.log(`✓ Invited candidate: ${invite.applicationToken ?? invite.application?.applicationToken ?? JSON.stringify(invite)}`);

  const appToken = invite.applicationToken ?? invite.application?.applicationToken ?? invite.application?.id;

  const webBase = process.env.WEB_URL || 'https://web-production-a52d7.up.railway.app';
  const applyUrl = `${webBase}/apply/${appToken}`;

  console.log('\n=== DONE ===');
  console.log(`Job ID:         ${job.id}`);
  console.log(`Simulation ID:  ${simId}`);
  console.log(`App Token:      ${appToken}`);
  console.log(`\nAPPLY URL:      ${applyUrl}`);
  console.log('\nPaste this URL into the Puppeteer script or open it in a browser.');
}

main().catch(err => { console.error(err); process.exit(1); });
