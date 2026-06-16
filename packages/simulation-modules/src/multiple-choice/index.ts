import { z } from 'zod';
import { StepScore } from '@job-sim/shared';
import { SimulationModule, ValidationResult, ModuleScoringInput, ModuleAnalytics, validate } from '../types';

const ConfigSchema = z.object({
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    isCorrect: z.boolean(),
    explanation: z.string().optional(),
  })),
  allowMultiple: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
});

const AnswerSchema = z.object({
  selectedOptionIds: z.array(z.string()),
});

type Config = z.infer<typeof ConfigSchema>;
type Answer = z.infer<typeof AnswerSchema>;


export const multipleChoiceModule: SimulationModule<Config, Answer> = {
  type: 'multiple_choice',
  label: 'Multiple Choice',
  description: 'Candidate selects one or more answers from a list of options.',

  configSchema: ConfigSchema,
  answerSchema: AnswerSchema,

  validateConfig: (c) => validate(ConfigSchema, c),
  validateAnswer: (a) => validate(AnswerSchema, a),

  getPublicCandidateConfig(config: Config) {
    return {
      question: config.question,
      options: config.options.map(o => ({ id: o.id, label: o.label })),
      allowMultiple: config.allowMultiple,
      randomizeOptions: config.randomizeOptions,
    };
  },

  async score(input: ModuleScoringInput<Config, Answer>): Promise<StepScore> {
    const { config, answer } = input;
    const correctIds = new Set(config.options.filter(o => o.isCorrect).map(o => o.id));
    const selectedIds = new Set(answer.selectedOptionIds);

    let totalScore = 0;
    let evidence = '';

    if (!config.allowMultiple) {
      const isCorrect = selectedIds.size === 1 && correctIds.has([...selectedIds][0]);
      totalScore = isCorrect ? 100 : 0;
      evidence = isCorrect ? 'Correct answer selected.' : 'Incorrect answer selected.';
    } else {
      const correct = [...selectedIds].filter(id => correctIds.has(id)).length;
      const incorrect = [...selectedIds].filter(id => !correctIds.has(id)).length;
      const missed = [...correctIds].filter(id => !selectedIds.has(id)).length;
      totalScore = Math.max(0, Math.round(((correct - incorrect) / correctIds.size) * 100));
      evidence = `Selected ${correct} correct, ${incorrect} incorrect, missed ${missed}.`;
    }

    const hasRedFlag = answer.selectedOptionIds.length === 0;

    return {
      stepId: input.sessionContext.sessionId,
      stepType: 'multiple_choice',
      totalScore,
      maxScore: 100,
      criteria: [{ key: 'accuracy', label: 'Answer accuracy', score: totalScore, maxScore: 100, evidence }],
      skillScores: [],
      redFlags: hasRedFlag ? [{ key: 'no_answer', severity: 'medium', message: 'No option selected' }] : [],
      summary: evidence,
      scoringMode: 'deterministic',
      confidence: 1,
      needsManualReview: false,
    };
  },

  async summarizeAnalytics(submissions): Promise<ModuleAnalytics> {
    const scores = submissions.map(s => (s.score as any)?.totalScore ?? 0);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      moduleType: 'multiple_choice',
      totalSubmissions: submissions.length,
      averageScore: avg,
      scoreDistribution: {},
      commonRedFlags: [],
      averageTimeSeconds: 0,
      completionRate: 1,
    };
  },
};
