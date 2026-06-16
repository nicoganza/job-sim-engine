import { z } from 'zod';
import { StepScore } from '@job-sim/shared';
import { SimulationModule, ValidationResult, ModuleScoringInput, ModuleAnalytics, validate } from '../types';

const ConfigSchema = z.object({
  callType: z.enum(['sales_discovery', 'sales_objection_handling', 'customer_success_renewal', 'support_escalation', 'hiring_interview', 'stakeholder_alignment']),
  title: z.string(),
  publicCandidateBrief: z.string(),
  estimatedDurationSeconds: z.number(),
  maxDurationSeconds: z.number(),
  aiPersona: z.object({
    name: z.string(),
    role: z.string(),
    company: z.string().optional(),
    personality: z.string(),
    communicationStyle: z.string(),
    baselineMood: z.enum(['friendly', 'neutral', 'skeptical', 'busy', 'frustrated']),
  }),
  publicBusinessContext: z.object({
    candidateCompany: z.string().optional(),
    productOrService: z.string().optional(),
    valueProposition: z.string().optional(),
    knownContext: z.array(z.string()).default([]),
  }),
  hiddenBuyerState: z.object({
    initialInterestLevel: z.number().min(0).max(100),
    initialTrustLevel: z.number().min(0).max(100),
    initialUrgencyLevel: z.number().min(0).max(100),
    hiddenObjections: z.array(z.object({
      id: z.string(),
      type: z.enum(['budget', 'timing', 'authority', 'need', 'trust', 'competition', 'implementation', 'risk', 'internal_resistance']),
      description: z.string(),
      revealCondition: z.string(),
      resolutionCondition: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })),
    buyingCriteria: z.array(z.object({
      id: z.string(),
      criterion: z.string(),
      importance: z.enum(['low', 'medium', 'high', 'critical']),
    })),
    dealBreakers: z.array(z.string()).default([]),
  }),
  allowedOutcomes: z.array(z.enum(['no_next_step', 'send_information', 'schedule_follow_up', 'schedule_demo', 'introduce_stakeholder', 'qualified_out', 'purchase_intent'])),
  guardrails: z.object({
    doNotRevealHiddenObjectionsDirectly: z.boolean().default(true),
    requireCandidateDiscoveryBeforeRevealingObjections: z.boolean().default(true),
    preventEasyAgreement: z.boolean().default(true),
    stayInPersona: z.boolean().default(true),
    refuseOutOfScenarioRequests: z.boolean().default(true),
    maxBuyerTalkRatio: z.number().optional(),
  }),
  scoringRubric: z.array(z.object({
    key: z.string(),
    label: z.string(),
    maxScore: z.number(),
    description: z.string(),
  })),
});

const AnswerSchema = z.object({
  callSessionId: z.string(),
  transcript: z.array(z.object({
    speaker: z.enum(['candidate', 'ai_buyer']),
    text: z.string(),
    timestampMs: z.number(),
  })),
  outcome: z.object({
    selectedOutcome: z.string(),
    aiBuyerInterestFinal: z.number().min(0).max(100),
    aiBuyerTrustFinal: z.number().min(0).max(100),
    aiBuyerUrgencyFinal: z.number().min(0).max(100),
    nextStepAgreed: z.boolean(),
  }),
  metrics: z.object({
    durationSeconds: z.number(),
    candidateTalkRatio: z.number().optional(),
    questionCount: z.number().optional(),
    objectionCount: z.number().optional(),
    interruptions: z.number().optional(),
  }).optional(),
});

type Config = z.infer<typeof ConfigSchema>;
type Answer = z.infer<typeof AnswerSchema>;


export const simulatedCallModule: SimulationModule<Config, Answer> = {
  type: 'simulated_call',
  label: 'Simulated Call',
  description: 'Candidate speaks with an AI buyer/customer in a realistic voice conversation.',

  configSchema: ConfigSchema,
  answerSchema: AnswerSchema,

  validateConfig: (c) => validate(ConfigSchema, c),
  validateAnswer: (a) => validate(AnswerSchema, a),

  getPublicCandidateConfig(config: Config) {
    // NEVER send hiddenBuyerState or guardrails to the candidate
    return {
      callType: config.callType,
      title: config.title,
      publicCandidateBrief: config.publicCandidateBrief,
      estimatedDurationSeconds: config.estimatedDurationSeconds,
      maxDurationSeconds: config.maxDurationSeconds,
      aiPersona: {
        name: config.aiPersona.name,
        role: config.aiPersona.role,
        company: config.aiPersona.company,
      },
      publicBusinessContext: config.publicBusinessContext,
      allowedOutcomes: config.allowedOutcomes,
    };
  },

  async score(input: ModuleScoringInput<Config, Answer>): Promise<StepScore> {
    // AI rubric scoring from transcript
    const { answer } = input;
    const hasTranscript = answer.transcript && answer.transcript.length > 2;

    return {
      stepId: input.sessionContext.sessionId,
      stepType: 'simulated_call',
      totalScore: 0,
      maxScore: 100,
      criteria: input.config.scoringRubric.map(r => ({ key: r.key, label: r.label, score: 0, maxScore: r.maxScore })),
      skillScores: [],
      redFlags: !hasTranscript ? [{ key: 'no_transcript', severity: 'high', message: 'No meaningful conversation recorded' }] : [],
      summary: 'Pending AI transcript scoring.',
      scoringMode: 'ai_rubric',
      confidence: 0,
      needsManualReview: !hasTranscript,
    };
  },

  async summarizeAnalytics(submissions): Promise<ModuleAnalytics> {
    const scores = submissions.map(s => (s.score as any)?.totalScore ?? 0).filter((s: number) => s > 0);
    const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    return { moduleType: 'simulated_call', totalSubmissions: submissions.length, averageScore: avg, scoreDistribution: {}, commonRedFlags: [], averageTimeSeconds: 0, completionRate: 1 };
  },
};
