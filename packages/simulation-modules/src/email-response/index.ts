import { z } from 'zod';
import { StepScore } from '@job-sim/shared';
import { SimulationModule, ValidationResult, ModuleScoringInput, ModuleAnalytics, validate } from '../types';

const EmailMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  timestamp: z.string(),
  subject: z.string(),
  body: z.string(),
});

const ConfigSchema = z.object({
  scenarioContext: z.string(),
  emailThread: z.array(EmailMessageSchema),
  taskPrompt: z.string(),
  expectedSignals: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
  rubric: z.array(z.object({
    key: z.string(),
    label: z.string(),
    maxScore: z.number(),
    description: z.string(),
  })).default([]),
});

const AnswerSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

type Config = z.infer<typeof ConfigSchema>;
type Answer = z.infer<typeof AnswerSchema>;


export const emailResponseModule: SimulationModule<Config, Answer> = {
  type: 'email_response',
  label: 'Email Response',
  description: 'Candidate writes a professional email reply to a simulated thread.',

  configSchema: ConfigSchema,
  answerSchema: AnswerSchema,

  validateConfig: (c) => validate(ConfigSchema, c),
  validateAnswer: (a) => validate(AnswerSchema, a),

  getPublicCandidateConfig(config: Config) {
    return {
      scenarioContext: config.scenarioContext,
      emailThread: config.emailThread,
      taskPrompt: config.taskPrompt,
    };
  },

  async score(input: ModuleScoringInput<Config, Answer>): Promise<StepScore> {
    const { answer } = input;
    const isEmpty = !answer.body || answer.body.trim().length < 20;
    const noSubject = !answer.subject || answer.subject.trim().length === 0;

    return {
      stepId: input.sessionContext.sessionId,
      stepType: 'email_response',
      totalScore: 0,
      maxScore: 100,
      criteria: input.config.rubric.map(r => ({ key: r.key, label: r.label, score: 0, maxScore: r.maxScore })),
      skillScores: [],
      redFlags: isEmpty ? [{ key: 'empty_response', severity: 'high', message: 'Email body is empty or too short' }] : noSubject ? [{ key: 'no_subject', severity: 'low', message: 'No subject line provided' }] : [],
      summary: 'Pending AI rubric scoring.',
      scoringMode: 'ai_rubric',
      confidence: 0,
      needsManualReview: isEmpty,
    };
  },

  async summarizeAnalytics(submissions): Promise<ModuleAnalytics> {
    const scores = submissions.map(s => (s.score as any)?.totalScore ?? 0).filter((s: number) => s > 0);
    const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    return { moduleType: 'email_response', totalSubmissions: submissions.length, averageScore: avg, scoreDistribution: {}, commonRedFlags: [], averageTimeSeconds: 0, completionRate: 1 };
  },
};
