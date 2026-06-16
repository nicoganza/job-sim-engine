import { z } from 'zod';
import { StepScore } from '@job-sim/shared';
import { SimulationModule, ValidationResult, ModuleScoringInput, ModuleAnalytics, validate } from '../types';

const ConfigSchema = z.object({
  prompt: z.string(),
  minWords: z.number().optional(),
  maxWords: z.number().optional(),
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
  text: z.string(),
});

type Config = z.infer<typeof ConfigSchema>;
type Answer = z.infer<typeof AnswerSchema>;


export const freeTextModule: SimulationModule<Config, Answer> = {
  type: 'free_text',
  label: 'Free Text',
  description: 'Candidate writes an open-ended response.',

  configSchema: ConfigSchema,
  answerSchema: AnswerSchema,

  validateConfig: (c) => validate(ConfigSchema, c),
  validateAnswer: (a) => validate(AnswerSchema, a),

  getPublicCandidateConfig(config: Config) {
    return {
      prompt: config.prompt,
      minWords: config.minWords,
      maxWords: config.maxWords,
    };
  },

  async score(input: ModuleScoringInput<Config, Answer>): Promise<StepScore> {
    // AI rubric scoring - return placeholder that triggers AI scoring in worker
    const wordCount = input.answer.text.trim().split(/\s+/).length;
    const isEmpty = wordCount < 5;
    const tooShort = input.config.minWords && wordCount < input.config.minWords;

    return {
      stepId: input.sessionContext.sessionId,
      stepType: 'free_text',
      totalScore: 0,
      maxScore: 100,
      criteria: input.config.rubric.map(r => ({ key: r.key, label: r.label, score: 0, maxScore: r.maxScore })),
      skillScores: [],
      redFlags: isEmpty ? [{ key: 'empty_answer', severity: 'high', message: 'Answer is essentially empty' }] : tooShort ? [{ key: 'too_short', severity: 'medium', message: `Answer is too short (${wordCount} words, minimum ${input.config.minWords})` }] : [],
      summary: 'Pending AI rubric scoring.',
      scoringMode: 'ai_rubric',
      confidence: 0,
      needsManualReview: isEmpty,
    };
  },

  async summarizeAnalytics(submissions): Promise<ModuleAnalytics> {
    const scores = submissions.map(s => (s.score as any)?.totalScore ?? 0).filter((s: number) => s > 0);
    const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    return { moduleType: 'free_text', totalSubmissions: submissions.length, averageScore: avg, scoreDistribution: {}, commonRedFlags: [], averageTimeSeconds: 0, completionRate: 1 };
  },
};
