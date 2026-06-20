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
  crm_prioritization: `{"scenarioContext":"you are an AE and it's Monday morning...","taskPrompt":"Rank these accounts by priority and explain your reasoning","records":[{"id":"r1","displayName":"Contact Name","company":"Company A","value":80000,"stage":"Negotiation","lastActivityAt":"2024-01-10","healthScore":85,"notes":["note 1"],"visibleSignals":["signal 1"],"hiddenPriorityScore":90,"hiddenRationale":"why this is top priority"},{"id":"r2","displayName":"Contact Name","company":"Company B","value":40000,"stage":"Discovery","lastActivityAt":"2024-01-08","healthScore":60,"notes":[],"visibleSignals":["signal 1"],"hiddenPriorityScore":40,"hiddenRationale":"why this is lower"},{"id":"r3","displayName":"Contact Name","company":"Company C","value":120000,"stage":"Proposal","lastActivityAt":"2024-01-12","healthScore":70,"notes":["urgent"],"visibleSignals":["signal 1","signal 2"],"hiddenPriorityScore":75,"hiddenRationale":"why"},{"id":"r4","displayName":"Contact Name","company":"Company D","value":20000,"stage":"Closed Lost","lastActivityAt":"2023-12-01","healthScore":20,"notes":[],"visibleSignals":["signal 1"],"hiddenPriorityScore":15,"hiddenRationale":"why low priority"}],"expectedTopRecordIds":["r1","r3"],"requiredExplanation":true,"scoringWeights":{"topChoiceAccuracy":0.35,"rankingQuality":0.30,"explanationQuality":0.25,"riskAwareness":0.10}}`,
  notification_reaction: `{"scenarioContext":"It's Tuesday at 9am, you're an AE just arriving at work","taskPrompt":"You have these notifications waiting. Handle each one appropriately.","notifications":[{"id":"n1","senderName":"Sarah Chen","senderRole":"VP Sales","channel":"slack","timestampOffsetMinutes":0,"message":"message text","hiddenUrgency":90,"hiddenImportance":95,"expectedActionTypes":["reply","escalate"],"hiddenRationale":"why this is urgent"},{"id":"n2","senderName":"Tom Baker","senderRole":"Client","channel":"email","timestampOffsetMinutes":5,"message":"message text","hiddenUrgency":75,"hiddenImportance":80,"expectedActionTypes":["reply"],"hiddenRationale":"why"},{"id":"n3","senderName":"System","senderRole":"CRM","channel":"crm_alert","timestampOffsetMinutes":10,"message":"alert text","hiddenUrgency":50,"hiddenImportance":60,"expectedActionTypes":["create_task","ignore"],"hiddenRationale":"why"}],"allowedActions":["reply","ignore","escalate","schedule_followup","create_task"],"scoringWeights":{"actionChoice":0.4,"prioritization":0.3,"communication":0.2,"escalationJudgment":0.1}}`,
  email_response: `{"scenarioContext":"context of the situation","emailThread":[{"id":"e1","from":"client@company.com","to":["rep@yoursaas.com"],"timestamp":"2024-01-15T10:30:00Z","subject":"Subject line","body":"email body content that the candidate must reply to"}],"taskPrompt":"Write a professional reply to this email","expectedSignals":["acknowledges the issue","proposes next steps","professional tone"],"redFlags":["defensive response","blaming","no next step"],"rubric":[{"key":"tone","label":"Professional tone","maxScore":25,"description":"Is the response professional and empathetic?"},{"key":"content","label":"Content quality","maxScore":35,"description":"Does it address all points?"},{"key":"next_steps","label":"Next steps","maxScore":25,"description":"Does it propose clear next steps?"},{"key":"conciseness","label":"Conciseness","maxScore":15,"description":"Is it appropriately concise?"}]}`,
  simulated_call: `{"callType":"sales_discovery","title":"Discovery call with prospect","publicCandidateBrief":"You are an AE at [company]. You have a discovery call with [prospect name], [role] at [company]. Background: [context].","estimatedDurationSeconds":600,"maxDurationSeconds":720,"aiPersona":{"name":"Alex Martinez","role":"Head of Operations","company":"Acme Corp","personality":"Analytical and data-driven. Asks pointed questions. Values ROI clarity.","communicationStyle":"Direct and concise. Gets to the point quickly. Impatient with vague answers.","baselineMood":"skeptical"},"publicBusinessContext":{"candidateCompany":"YourSaaS","productOrService":"B2B SaaS platform","valueProposition":"Reduces operational overhead by 40%","knownContext":["They have 200 employees","They use legacy software"]},"hiddenBuyerState":{"initialInterestLevel":40,"initialTrustLevel":30,"initialUrgencyLevel":25,"hiddenObjections":[{"id":"obj1","type":"budget","description":"Budget is frozen until Q3","revealCondition":"When candidate asks about budget timeline","resolutionCondition":"Candidate acknowledges timing and proposes phased approach","severity":"high"},{"id":"obj2","type":"trust","description":"Bad experience with similar vendor","revealCondition":"When candidate asks about past attempts to solve this","resolutionCondition":"Candidate demonstrates differentiators with evidence","severity":"medium"}],"buyingCriteria":[{"id":"c1","criterion":"Clear ROI within 6 months","importance":"critical"},{"id":"c2","criterion":"Minimal implementation disruption","importance":"high"},{"id":"c3","criterion":"Dedicated support","importance":"medium"}],"dealBreakers":["Requires more than 3 months to implement","No case studies in their industry"]},"allowedOutcomes":["schedule_follow_up","schedule_demo","send_information"],"guardrails":{"doNotRevealHiddenObjectionsDirectly":true,"requireCandidateDiscoveryBeforeRevealingObjections":true,"preventEasyAgreement":true,"stayInPersona":true,"refuseOutOfScenarioRequests":true},"scoringRubric":[{"key":"discovery","label":"Discovery quality","maxScore":30,"description":"Did the candidate ask good open-ended questions to uncover needs?"},{"key":"objection_handling","label":"Objection handling","maxScore":30,"description":"Did the candidate handle objections with empathy and evidence?"},{"key":"value_articulation","label":"Value articulation","maxScore":20,"description":"Did the candidate connect the product to the prospect's specific needs?"},{"key":"next_steps","label":"Next steps","maxScore":20,"description":"Did the candidate secure a clear, concrete next step?"}]}`,
};

function buildPrompt(type: string, title: string, instructions: string, jobTitle?: string, jobDescription?: string): string {
  const ctx = `Role: ${jobTitle || 'Sales professional'}\nJob description: ${(jobDescription || '').slice(0, 600)}\nStep title: ${title}\nStep instructions: ${instructions}`.trim();
  return `You are an expert at designing realistic job simulation assessments.

CONTEXT:
${ctx}

Generate a realistic, challenging, and highly specific configuration for a "${type}" simulation step.
The scenario MUST be directly relevant to the job role and context above.
Output ONLY a valid JSON object matching this structure exactly:
${SCHEMAS[type] ?? '{}'}

Rules:
- Make names, companies, numbers, and scenarios specific and realistic (not generic placeholders)
- Make the scenario genuinely challenging for the target role
- For hidden fields (hiddenRationale, hiddenUrgency, etc.), be specific about WHY
- Adapt the difficulty to a professional-level candidate for this role
- Output ONLY the JSON, no explanation`;
}

export async function processAiFillJob(job: Job) {
  const { stepId, simulationId, organizationId } = job.data;
  console.log(`[ai-fill] Processing step ${stepId}`);

  const step = await prisma.simulationStep.findFirst({ where: { id: stepId, organizationId } });
  if (!step) throw new Error(`Step ${stepId} not found`);

  const sim = await prisma.simulation.findFirst({
    where: { id: simulationId, organizationId },
    include: { jobPosting: { select: { title: true, description: true } } },
  });
  const jobPost = (sim as any)?.jobPosting;

  const prompt = buildPrompt(step.type, step.title, step.instructions ?? '', jobPost?.title, jobPost?.description);

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
