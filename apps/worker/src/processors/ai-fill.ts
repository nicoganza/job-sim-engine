import { Job } from 'bullmq';
import OpenAI from 'openai';
import https from 'https';
import { prisma } from '../lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 90000,
  httpAgent: new https.Agent({ keepAlive: true }),
});

const SCHEMAS: Record<string, string> = {
  multiple_choice: `{"question":"situational question relevant to the role","options":[{"id":"a","label":"option text","isCorrect":true},{"id":"b","label":"option text","isCorrect":false},{"id":"c","label":"option text","isCorrect":false},{"id":"d","label":"option text","isCorrect":false}],"allowMultiple":false,"randomizeOptions":true}`,
  free_text: `{"prompt":"what the candidate must write/answer","expectedSignals":["signal 1","signal 2","signal 3"],"redFlags":["red flag 1","red flag 2"],"rubric":[{"key":"clarity","label":"Clarity","maxScore":25,"description":"explanation"},{"key":"depth","label":"Depth","maxScore":25,"description":"explanation"},{"key":"relevance","label":"Relevance","maxScore":25,"description":"explanation"},{"key":"action","label":"Action orientation","maxScore":25,"description":"explanation"}]}`,
  welcome: `{"founderName":"Nome Founder","founderRole":"CEO & Co-Founder","founderMessage":"Ciao! Sono felice che tu stia esplorando questa opportunità. [2-3 frasi entusiaste sul ruolo e l'azienda]","minReadSeconds":20}`,
  welcome_tts: `{"persona":{"name":"Nome Relatore","title":"CEO & Co-Founder","voice":"ash","voiceInstructions":"Parla con entusiasmo genuino, tono caldo e diretto. Ritmo moderato, fai una breve pausa tra i punti chiave. Sei il founder appassionato dell'azienda."},"slides":[{"text":"Ciao! Sono [Nome], CEO di [Azienda]. Sono davvero contento che tu stia esplorando questa opportunità con noi."},{"text":"In [Azienda] stiamo costruendo [cosa fa l'azienda]. Il nostro team è formato da professionisti appassionati che [valore chiave]."},{"text":"Il ruolo che stiamo cercando di coprire è fondamentale per noi: [descrizione del ruolo e impatto atteso in 1-2 frasi]."},{"text":"Nelle prossime sezioni avrai modo di mettere alla prova le tue competenze in scenari reali. Buona fortuna, e ricorda: non esistono risposte perfette, vogliamo capire il tuo modo di ragionare."}],"minReadSeconds":15}`,
  crm_prioritization: `{"scenarioContext":"you are an AE and it's Monday morning...","taskPrompt":"Rank these accounts by priority and explain your reasoning","records":[{"id":"r1","displayName":"Contact Name","company":"Company A","value":80000,"stage":"Negotiation","lastActivityAt":"2024-01-10","healthScore":85,"notes":["note 1"],"visibleSignals":["signal 1"],"hiddenPriorityScore":90,"hiddenRationale":"why this is top priority"},{"id":"r2","displayName":"Contact Name","company":"Company B","value":40000,"stage":"Discovery","lastActivityAt":"2024-01-08","healthScore":60,"notes":[],"visibleSignals":["signal 1"],"hiddenPriorityScore":40,"hiddenRationale":"why this is lower"},{"id":"r3","displayName":"Contact Name","company":"Company C","value":120000,"stage":"Proposal","lastActivityAt":"2024-01-12","healthScore":70,"notes":["urgent"],"visibleSignals":["signal 1","signal 2"],"hiddenPriorityScore":75,"hiddenRationale":"why"},{"id":"r4","displayName":"Contact Name","company":"Company D","value":20000,"stage":"Closed Lost","lastActivityAt":"2023-12-01","healthScore":20,"notes":[],"visibleSignals":["signal 1"],"hiddenPriorityScore":15,"hiddenRationale":"why low priority"}],"expectedTopRecordIds":["r1","r3"],"requiredExplanation":true,"scoringWeights":{"topChoiceAccuracy":0.35,"rankingQuality":0.30,"explanationQuality":0.25,"riskAwareness":0.10}}`,
  crm_prioritization_rich: `{"scenarioContext":"Sono le 8:30 di lunedì. Sei un SDR e hai appena aperto il CRM: ci sono 5 lead inbound arrivati nel weekend. Hai 15 minuti prima del team meeting.","taskPrompt":"Analizza i lead e costruisci la tua lista di priorità. Trascina i lead nella lista a sinistra e spiega il ragionamento.","timeLimitSeconds":900,"maxRankedItems":3,"records":[{"id":"r1","displayName":"Marco Ferretti","company":"Gruppo Ferretti SPA","contactRole":"Head of Sales","sector":"Manifatturiero B2B","employees":"200-500","location":"Milano","website":"gruppoferretti.it","source":{"type":"Inbound form","icon":"📋"},"signalStrength":"alto","avatarColor":"linear-gradient(135deg,#6366f1,#7c3aed)","activities":[{"icon":"🔥","text":"Ha visitato la pricing page 4 volte negli ultimi 3 giorni","date":"2 giorni fa"},{"icon":"📋","text":"Ha compilato il form demo alle 22:47 di domenica","date":"Ieri sera"}],"formNote":"Stiamo cercando qualcosa per strutturare il processo commerciale. Siamo in 12 nel team sales.","missingInfo":["Budget non indicato","Timeline sconosciuta"],"hiddenPriorityScore":92,"hiddenRationale":"Intent altissimo, pain point chiaro, dimensione ideale","notes":[],"visibleSignals":[]},{"id":"r2","displayName":"Sofia Marchetti","company":"Marchetti & Partners","avatarColor":"linear-gradient(135deg,#f59e0b,#d97706)","source":{"type":"LinkedIn Ad","icon":"💼"},"signalStrength":"basso","activities":[{"icon":"👆","text":"Ha cliccato l'annuncio LinkedIn","date":"Ieri"}],"hiddenPriorityScore":18,"hiddenRationale":"Studio piccolo, intent basso, nessun segnale di urgenza","notes":[],"visibleSignals":[]},{"id":"r3","displayName":"Luca Barone","company":"TechFlow SRL","contactRole":"CTO","contactEmail":"l.barone@techflow.io","sector":"SaaS B2B","employees":"50-100","revenue":"€3.2M ARR","website":"techflow.io","source":{"type":"Referral","icon":"🤝"},"signalStrength":"alto","avatarColor":"linear-gradient(135deg,#10b981,#059669)","activities":[{"icon":"🤝","text":"Referral da cliente attivo (Gianluca Russo, CEO di Nexo)","date":"Venerdì"},{"icon":"👀","text":"Ha visitato la documentazione tecnica per 28 minuti","date":"Sabato"}],"formNote":"Gianluca Russo ci ha suggerito di contattarvi. Siamo in fase di scale.","hiddenPriorityScore":88,"hiddenRationale":"Referral = trust precostruito, ARR solido, urgenza organica","notes":[],"visibleSignals":[]},{"id":"r4","displayName":"Alessia Romano","company":"Romano Fashion Group","contactRole":"Marketing Manager","sector":"Retail","employees":"500-1000","location":"Roma","source":{"type":"Webinar","icon":"🎥"},"signalStrength":"medio","avatarColor":"linear-gradient(135deg,#ec4899,#be185d)","activities":[{"icon":"🎥","text":"Ha partecipato al webinar Sales automation","date":"Giovedì"}],"missingInfo":["Budget","Ruolo decisionale"],"hiddenPriorityScore":45,"hiddenRationale":"Azienda grande ma buyer sbagliato, settore non ICP core","notes":[],"visibleSignals":[]},{"id":"r5","displayName":"Giorgio Conti","company":"Conti Costruzioni SRL","location":"Torino","avatarColor":"linear-gradient(135deg,#f97316,#ea580c)","source":{"type":"Google Ads","icon":"🔍"},"activities":[{"icon":"🔍","text":"Ha cercato software gestione clienti su Google","date":"Sabato"}],"formNote":"Cerco qualcosa di semplice, non voglio cose complicate.","hiddenPriorityScore":38,"hiddenRationale":"Settore fuori ICP, richiesta semplicità = basso budget","notes":[],"visibleSignals":[]}],"expectedTopRecordIds":["r1","r3"],"requiredExplanation":true,"scoringWeights":{"topChoiceAccuracy":0.35,"rankingQuality":0.30,"explanationQuality":0.25,"riskAwareness":0.10}}`,
  notification_reaction: `{"scenarioContext":"It's Tuesday at 9am, you're an AE just arriving at work","taskPrompt":"You have these notifications waiting. Handle each one appropriately.","notifications":[{"id":"n1","senderName":"Sarah Chen","senderRole":"VP Sales","channel":"slack","timestampOffsetMinutes":0,"message":"message text","hiddenUrgency":90,"hiddenImportance":95,"expectedActionTypes":["reply","escalate"],"hiddenRationale":"why this is urgent"},{"id":"n2","senderName":"Tom Baker","senderRole":"Client","channel":"email","timestampOffsetMinutes":5,"message":"message text","hiddenUrgency":75,"hiddenImportance":80,"expectedActionTypes":["reply"],"hiddenRationale":"why"},{"id":"n3","senderName":"System","senderRole":"CRM","channel":"crm_alert","timestampOffsetMinutes":10,"message":"alert text","hiddenUrgency":50,"hiddenImportance":60,"expectedActionTypes":["create_task","ignore"],"hiddenRationale":"why"}],"allowedActions":["reply","ignore","escalate","schedule_followup","create_task"],"scoringWeights":{"actionChoice":0.4,"prioritization":0.3,"communication":0.2,"escalationJudgment":0.1}}`,
  notification_reaction_slack: `{"scenarioContext":"È il tuo primo giorno ufficiale nel team. Il tuo manager ti ha aggiunto al workspace Slack dell'azienda.","taskPrompt":"Esplora il workspace, leggi i messaggi del team e rispondi in modo naturale. Fatti un'idea del contesto in cui lavorerai.","workspace":{"name":"[NomeAzienda] HQ"},"channels":[{"id":"welcome","name":"welcome","topic":"Benvenuto nel team!"},{"id":"sales-team","name":"sales-team","topic":"Updates e discussioni del team commerciale"},{"id":"general","name":"general","topic":"Comunicazioni generali"}],"teamMembers":[{"id":"marco","name":"Marco Verdi","initials":"MV","color":"linear-gradient(135deg,#10b981,#059669)","role":"Sales Manager","aiPersonality":"Diretto, entusiasta, molto pratico. Parla in modo informale e usa spesso emoji. Fa domande concrete sul background del candidato.","aiRules":["Non rivelare i target di revenue specifici","Incoraggia il candidato a fare domande","Dopo 2 scambi suggerisci di guardare il CRM"]},{"id":"giulia","name":"Giulia Bianchi","initials":"GB","color":"linear-gradient(135deg,#6366f1,#7c3aed)","role":"Senior AE","aiPersonality":"Amichevole e disponibile. Condivide consigli pratici dal campo. Usa esempi concreti dalle sue esperienze di vendita.","aiRules":["Dai consigli pratici su come funziona il team","Menziona il metodo commerciale usato dall'azienda in modo vago"]},{"id":"luca","name":"Luca Ferrari","initials":"LF","color":"linear-gradient(135deg,#f59e0b,#d97706)","role":"BDR Lead","aiPersonality":"Giovane, energico, molto focalizzato sui numeri. Parla di KPI e di quante call fa al giorno.","aiRules":["Condividi metriche di team in modo generico","Non rivelare i compensi"]}],"welcomeSequence":[{"memberId":"marco","text":"Ciao! 👋 Benvenuto nel team! Sono Marco, il tuo Sales Manager. Super contento di averti a bordo!","channel":"welcome","delayMs":800},{"memberId":"marco","text":"Ho già preparato un po' di materiale per farti ambientare. Ma prima dimmi — come stai? Pronto per iniziare? 💪","channel":"welcome","delayMs":2500},{"memberId":"giulia","text":"Ehi! Anche io volevo darti il benvenuto 😊 Sono Giulia, Senior AE. Se hai domande sul day-to-day non esitare a scrivermi!","channel":"welcome","delayMs":4000},{"memberId":"luca","text":"Welcome! 🔥 Luca qui, BDR Lead. Se vuoi capire come funziona il processo di prospecting ne parliamo quando vuoi","channel":"sales-team","delayMs":5500}],"ctaLabel":"Ora che hai conosciuto il team, è il momento del tuo primo task reale: prioritizza i lead inbound di oggi.","maxRepliesPerChannel":3}`,
  email_response: `{"scenarioContext":"context of the situation","emailThread":[{"id":"e1","from":"client@company.com","to":["rep@yoursaas.com"],"timestamp":"2024-01-15T10:30:00Z","subject":"Subject line","body":"email body content that the candidate must reply to"}],"taskPrompt":"Write a professional reply to this email","expectedSignals":["acknowledges the issue","proposes next steps","professional tone"],"redFlags":["defensive response","blaming","no next step"],"rubric":[{"key":"tone","label":"Professional tone","maxScore":25,"description":"Is the response professional and empathetic?"},{"key":"content","label":"Content quality","maxScore":35,"description":"Does it address all points?"},{"key":"next_steps","label":"Next steps","maxScore":25,"description":"Does it propose clear next steps?"},{"key":"conciseness","label":"Conciseness","maxScore":15,"description":"Is it appropriately concise?"}]}`,
  simulated_call: `{"callType":"sales_discovery","title":"Discovery call with prospect","publicCandidateBrief":"You are an AE at [company]. You have a discovery call with [prospect name], [role] at [company]. Background: [context].","estimatedDurationSeconds":600,"maxDurationSeconds":720,"aiPersona":{"name":"Alex Martinez","role":"Head of Operations","company":"Acme Corp","personality":"Analytical and data-driven. Asks pointed questions. Values ROI clarity.","communicationStyle":"Direct and concise. Gets to the point quickly. Impatient with vague answers.","baselineMood":"skeptical"},"publicBusinessContext":{"candidateCompany":"YourSaaS","productOrService":"B2B SaaS platform","valueProposition":"Reduces operational overhead by 40%","knownContext":["They have 200 employees","They use legacy software"]},"hiddenBuyerState":{"initialInterestLevel":40,"initialTrustLevel":30,"initialUrgencyLevel":25,"hiddenObjections":[{"id":"obj1","type":"budget","description":"Budget is frozen until Q3","revealCondition":"When candidate asks about budget timeline","resolutionCondition":"Candidate acknowledges timing and proposes phased approach","severity":"high"},{"id":"obj2","type":"trust","description":"Bad experience with similar vendor","revealCondition":"When candidate asks about past attempts to solve this","resolutionCondition":"Candidate demonstrates differentiators with evidence","severity":"medium"}],"buyingCriteria":[{"id":"c1","criterion":"Clear ROI within 6 months","importance":"critical"},{"id":"c2","criterion":"Minimal implementation disruption","importance":"high"},{"id":"c3","criterion":"Dedicated support","importance":"medium"}],"dealBreakers":["Requires more than 3 months to implement","No case studies in their industry"]},"allowedOutcomes":["schedule_follow_up","schedule_demo","send_information"],"guardrails":{"doNotRevealHiddenObjectionsDirectly":true,"requireCandidateDiscoveryBeforeRevealingObjections":true,"preventEasyAgreement":true,"stayInPersona":true,"refuseOutOfScenarioRequests":true},"scoringRubric":[{"key":"discovery","label":"Discovery quality","maxScore":30,"description":"Did the candidate ask good open-ended questions to uncover needs?"},{"key":"objection_handling","label":"Objection handling","maxScore":30,"description":"Did the candidate handle objections with empathy and evidence?"},{"key":"value_articulation","label":"Value articulation","maxScore":20,"description":"Did the candidate connect the product to the prospect's specific needs?"},{"key":"next_steps","label":"Next steps","maxScore":20,"description":"Did the candidate secure a clear, concrete next step?"}]}`,
  spreadsheet_edit: `{"scenarioContext":"Sei un Account Executive e il tuo manager ti ha mandato un file con i dati di pipeline Q1. Devi analizzarli e compilare il riepilogo.","taskPrompt":"Completa le celle indicate nel foglio: inserisci i valori calcolati nelle celle numeriche e scrivi la tua analisi nelle celle di commento.","templateSheetUrl":"PLACEHOLDER_TEMPLATE_ID","cells":[{"ref":"B5","label":"Totale valore pipeline","cellType":"numeric","expectedValue":"285000","numericTolerance":2,"weight":2},{"ref":"B6","label":"Media valore per deal","cellType":"numeric","expectedValue":"57000","numericTolerance":2,"weight":2},{"ref":"B8","label":"% deal in Negotiation","cellType":"formula","expectedValue":"40%","weight":1},{"ref":"D3","label":"Analisi del rischio pipeline","cellType":"text","weight":2},{"ref":"D6","label":"Raccomandazione priorità","cellType":"comment","weight":3}],"textRubric":[{"key":"analisi_rischio","label":"Analisi del rischio","maxScore":40,"description":"Il candidato identifica correttamente i deal a rischio con motivazione specifica?"},{"key":"raccomandazione","label":"Qualità della raccomandazione","maxScore":60,"description":"La raccomandazione è specifica, realistica e supportata dai dati?"}],"expectedSignals":["identifica i deal in stallo","propone azioni concrete","usa i dati per supportare le conclusioni"],"redFlags":["analisi generica senza riferimento ai dati","raccomandazione vaga","ignora i deal a rischio"]}`,
};

function detectSchemaKey(type: string, existingConfig: any): string {
  if (type === 'crm_prioritization') return 'crm_prioritization_rich';
  if (type === 'notification_reaction') {
    if (existingConfig?.workspace) return 'notification_reaction_slack';
  }
  if (type === 'welcome') {
    if (existingConfig?.persona || existingConfig?.slides?.length) return 'welcome_tts';
  }
  return type;
}

function buildPrompt(type: string, title: string, instructions: string, jobTitle?: string, jobDescription?: string, orgName?: string, existingConfig?: any): string {
  const candidateCompany = orgName || 'Azienda';
  const schemaKey = detectSchemaKey(type, existingConfig ?? {});

  const ctx = [
    `Azienda che assume (il candidato lavora QUI): ${candidateCompany}`,
    `Ruolo: ${jobTitle || 'Sales professional'}`,
    `Descrizione del ruolo: ${(jobDescription || '').slice(0, 600)}`,
    `Titolo dello step: ${title}`,
    `Istruzioni dello step: ${instructions}`,
  ].join('\n').trim();

  const extraRules =
    type === 'simulated_call' ? `
- In "publicCandidateBrief": usa "${candidateCompany}" come azienda del candidato, usa ESATTAMENTE lo stesso nome e azienda del prospect che hai definito in "aiPersona" (non usare placeholder come [nome] o [azienda]), e crea un contesto fittizio ma realistico e coerente con il settore
- Assicurati che publicCandidateBrief, aiPersona e publicBusinessContext siano completamente coerenti tra loro (stessi nomi, stessa azienda del prospect, stesso prodotto/servizio)` :
    type === 'spreadsheet_edit' ? `
- "templateSheetUrl" DEVE essere esattamente la stringa "PLACEHOLDER_TEMPLATE_ID" (l'admin sostituirà questo valore con l'URL del template reale)
- Le celle (cells[]) devono essere specifiche e coerenti con il contesto del ruolo e dello scenario
- I riferimenti cella (ref) devono essere nel formato A1 (es. "B3", "C5", "D10")
- Per le celle numeriche (numeric) includi sempre expectedValue e numericTolerance
- Per le celle formula (formula) includi il valore atteso come stringa
- Per le celle testuali (text/comment) il campo expectedValue NON deve essere incluso` :
    schemaKey === 'crm_prioritization_rich' ? `
- Genera esattamente 5 lead inbound realistici e specifici per il ruolo (non generici)
- Ogni lead DEVE sempre avere: id (r1–r5), displayName, company, hiddenPriorityScore (0–100), hiddenRationale, notes (array vuoto ok), visibleSignals (array vuoto ok)
- avatarColor (CSS linear-gradient) DEVE sempre essere presente — usa colori diversi per ogni lead

DISTRIBUZIONE CAMPI OPZIONALI (simula un CRM incompleto — varia tra i lead):
  * contactRole: ~3 lead su 5
  * contactEmail: ~2 lead su 5
  * contactPhone: ~1 lead su 5
  * sector: ~4 lead su 5
  * employees: ~3 lead su 5
  * revenue: ~2 lead su 5 (solo lead qualificati con employees > 50)
  * location: ~3 lead su 5
  * website: ~3 lead su 5
  * source (type + icon emoji): ~4 lead su 5 — usa fonti DIVERSE tra i lead (non tutti dalla stessa fonte)
  * signalStrength (alto/medio/basso): ~4 lead su 5
  * activities (array di 2-4 oggetti con icon emoji, text, date): ~4 lead su 5
  * formNote (citazione diretta del lead, prima persona, breve): ~2-3 lead su 5
  * missingInfo (array 2-3 stringhe): ~3 lead su 5 — elenca solo campi REALMENTE assenti nel profilo
- Se un campo opzionale non è presente, NON includerlo nel JSON (no null, no stringa vuota — ometti del tutto)

REGOLE DI COERENZA OBBLIGATORIE:
1. SOURCE → CONTATTO: Se source.type è "Inbound form" o "Demo request", il lead DEVE avere almeno uno tra contactEmail e contactPhone — ha compilato un modulo, ha lasciato un recapito
2. SOURCE → ACTIVITIES: Le activities descrivono comportamenti SUCCESSIVI all'arrivo, NON la source stessa (il chip source la mostra già). Es: "Inbound form" → NON scrivere "Ha compilato il form" ma piuttosto "Ha visitato la pricing page 3 volte", "Ha aperto l'email di follow-up"; "Referral" → NON scrivere "Referral da X" ma "Ha fissato una call esplorativa", "Ha chiesto la documentazione tecnica"; "LinkedIn Ad" → NON scrivere "Ha cliccato l'annuncio" ma "Ha visitato il sito per 8 minuti", "Ha aperto 3 case study"; "Webinar" → NON scrivere "Ha partecipato al webinar" ma "Ha fatto 2 domande durante il Q&A", "Ha richiesto la registrazione"; "Google Ads" → NON scrivere "Ha cercato su Google" ma "Ha visitato la pricing page", "Ha confrontato i piani"
3. SOURCE → formNote: formNote ha senso solo se source è "Inbound form", "Demo request" o "Referral" — chi arriva da LinkedIn Ad o Google Ads non lascia note
4. SIGNALSTRENGTH → SCORE: devono essere allineati — alto = hiddenPriorityScore ≥ 70; medio = 40–69; basso = < 40. Non generare lead con signalStrength "alto" e score basso o viceversa
5. MISSINGINFO → COERENZA: missingInfo deve elencare solo campi assenti nel JSON del lead stesso (es. se contactEmail c'è, non scrivere "Email non presente" in missingInfo)
6. REFERRAL → QUALITÀ: I lead da Referral tendono ad avere hiddenPriorityScore alto (≥ 75) e formNote che cita chi li ha mandati
7. COLD TRAFFIC → SEGNALI BASSI: Lead da Google Ads o LinkedIn Ad senza altre interazioni hanno tipicamente signalStrength "basso" o "medio" e hiddenPriorityScore < 50
8. REVENUE → EMPLOYEES: revenue appare solo se employees è presente e ≥ 50; le dimensioni devono essere coerenti (es. "€500K ARR" non si abbina a "1000-5000 dipendenti")
9. VARIETÀ: I 5 lead devono avere fonti, settori, livelli di priorità e profili di rischio diversi — non tutti da Inbound form, non tutti con score alto
10. ACTIVITIES DATES: Le date nelle activities devono essere coerenti con lo scenario (es. se lo scenario è "lunedì mattina", le activities più recenti sono "Ieri sera", "Sabato", "Venerdì")

- expectedTopRecordIds: i 2-3 lead con hiddenPriorityScore più alto
- Aggiungi timeLimitSeconds: 900 e maxRankedItems: 3` :
    schemaKey === 'notification_reaction_slack' ? `
- Genera un workspace Slack realistico per l'azienda "${candidateCompany}" con il ruolo "${jobTitle || 'Sales'}"
- I teamMembers devono avere personalità distinte e coerenti con il settore — NON usare nomi generici come "Marco Verdi"
- La welcomeSequence deve essere naturale, calda e specifica per l'azienda — 4-6 messaggi su 2-3 canali
- L'aiPersonality di ogni membro deve essere specifica e distintiva
- Il ctaLabel deve dare un'anteprima del prossimo step della simulazione
- Usa emoji appropriate nei messaggi di benvenuto` :
    schemaKey === 'welcome_tts' ? `
- La persona deve avere nome, titolo e voiceInstructions specifiche per il ruolo dell'azienda "${candidateCompany}"
- Genera 4-5 slide: benvenuto personale, descrizione dell'azienda, descrizione del ruolo, cosa aspettarsi dalla simulazione
- Ogni slide deve essere 1-3 frasi, tono colloquiale e caldo, come se stesse parlando direttamente al candidato
- Le slide devono essere coerenti tra loro come se fossero un discorso continuo` : '';

  return `You are an expert at designing realistic job simulation assessments.

CONTEXT:
${ctx}

Generate a realistic, challenging, and highly specific configuration for a "${type}" simulation step.
The scenario MUST be directly relevant to the job role and context above.
Output ONLY a valid JSON object matching this structure exactly:
${SCHEMAS[schemaKey] ?? SCHEMAS[type] ?? '{}'}

Rules:
- ALL text fields MUST be written in Italian
- Make names, companies, numbers, and scenarios specific and realistic — NO generic placeholders
- Make the scenario genuinely challenging for the target role
- For hidden fields (hiddenRationale, hiddenUrgency, etc.), be specific about WHY
- Adapt the difficulty to a professional-level candidate for this role${extraRules}
- Output ONLY the JSON, no explanation`;
}

export async function processAiFillJob(job: Job) {
  const { stepId, simulationId, organizationId } = job.data;
  console.log(`[ai-fill] Processing step ${stepId}`);

  const step = await prisma.simulationStep.findFirst({ where: { id: stepId, organizationId } });
  if (!step) throw new Error(`Step ${stepId} not found`);

  const [sim, org] = await Promise.all([
    prisma.simulation.findFirst({
      where: { id: simulationId, organizationId },
      include: { jobPosting: { select: { title: true, description: true } } },
    }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
  ]);
  const jobPost = (sim as any)?.jobPosting;

  const prompt = buildPrompt(step.type, step.title, step.instructions ?? '', jobPost?.title, jobPost?.description, org?.name, step.config);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const config = JSON.parse(completion.choices[0].message.content || '{}');
  await prisma.simulationStep.updateMany({ where: { id: stepId, organizationId }, data: { config } });

  console.log(`[ai-fill] Step ${stepId} filled (type: ${step.type})`);
  return { config };
}
