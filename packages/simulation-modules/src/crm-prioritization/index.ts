import { z } from 'zod';
import { StepScore } from '@job-sim/shared';
import { SimulationModule, ValidationResult, ModuleScoringInput, ModuleAnalytics, validate } from '../types';

const CrmRecordSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  company: z.string().optional(),
  value: z.number().optional(),
  stage: z.string().optional(),
  lastActivityAt: z.string().optional(),
  healthScore: z.number().optional(),
  notes: z.array(z.string()).default([]),
  visibleSignals: z.array(z.string()).default([]),
  hiddenPriorityScore: z.number(),
  hiddenRationale: z.string(),
});

const ConfigSchema = z.object({
  scenarioContext: z.string(),
  taskPrompt: z.string(),
  records: z.array(CrmRecordSchema),
  maxRankedItems: z.number().optional(),
  requiredExplanation: z.boolean().default(true),
  expectedTopRecordIds: z.array(z.string()),
  scoringWeights: z.object({
    topChoiceAccuracy: z.number(),
    rankingQuality: z.number(),
    explanationQuality: z.number(),
    riskAwareness: z.number(),
  }),
});

const AnswerSchema = z.object({
  orderedRecordIds: z.array(z.string()),
  explanation: z.string().optional(),
});

type Config = z.infer<typeof ConfigSchema>;
type Answer = z.infer<typeof AnswerSchema>;


function computeRankingScore(expected: string[], actual: string[]): number {
  if (!actual.length) return 0;
  let score = 0;
  const topN = Math.min(expected.length, actual.length);
  for (let i = 0; i < topN; i++) {
    const expectedId = expected[i];
    const actualPos = actual.indexOf(expectedId);
    if (actualPos === -1) continue;
    const posScore = Math.max(0, 1 - Math.abs(i - actualPos) / topN);
    score += posScore;
  }
  return Math.round((score / topN) * 100);
}

export const crmPrioritizationModule: SimulationModule<Config, Answer> = {
  type: 'crm_prioritization',
  label: 'CRM Prioritization',
  description: 'Candidate ranks CRM records by business priority and explains reasoning.',

  configSchema: ConfigSchema,
  answerSchema: AnswerSchema,

  validateConfig: (c) => validate(ConfigSchema, c),
  validateAnswer: (a) => validate(AnswerSchema, a),

  getPublicCandidateConfig(config: Config) {
    return {
      scenarioContext: config.scenarioContext,
      taskPrompt: config.taskPrompt,
      records: config.records.map(r => ({
        id: r.id,
        displayName: r.displayName,
        company: r.company,
        value: r.value,
        stage: r.stage,
        lastActivityAt: r.lastActivityAt,
        healthScore: r.healthScore,
        notes: r.notes,
        visibleSignals: r.visibleSignals,
      })),
      maxRankedItems: config.maxRankedItems,
      requiredExplanation: config.requiredExplanation,
    };
  },

  async score(input: ModuleScoringInput<Config, Answer>): Promise<StepScore> {
    const { config, answer } = input;
    const w = config.scoringWeights;

    const rankScore = computeRankingScore(config.expectedTopRecordIds, answer.orderedRecordIds);
    const topChoiceCorrect = answer.orderedRecordIds[0] === config.expectedTopRecordIds[0];
    const topChoiceScore = topChoiceCorrect ? 100 : answer.orderedRecordIds.some(id => config.expectedTopRecordIds.slice(0, 2).includes(id)) ? 50 : 0;
    const explanationScore = answer.explanation && answer.explanation.length > 50 ? 70 : 30; // placeholder, gets AI score in worker

    // Check for critical missed records
    const highPriorityMissed = config.expectedTopRecordIds.slice(0, 2).filter(id => !answer.orderedRecordIds.includes(id));
    const redFlags = highPriorityMissed.length > 0 ? [{ key: 'missed_critical_record', severity: 'high' as const, message: `Missed ${highPriorityMissed.length} high-priority record(s)` }] : [];

    const totalScore = Math.round(
      topChoiceScore * w.topChoiceAccuracy +
      rankScore * w.rankingQuality +
      explanationScore * w.explanationQuality +
      (highPriorityMissed.length === 0 ? 100 : 0) * w.riskAwareness
    );

    return {
      stepId: input.sessionContext.sessionId,
      stepType: 'crm_prioritization',
      totalScore,
      maxScore: 100,
      criteria: [
        { key: 'top_choice', label: 'Top choice accuracy', score: topChoiceScore, maxScore: 100, evidence: topChoiceCorrect ? 'Correct top priority identified' : 'Top priority incorrect' },
        { key: 'ranking', label: 'Overall ranking quality', score: rankScore, maxScore: 100, evidence: `Ranking alignment: ${rankScore}%` },
        { key: 'explanation', label: 'Explanation quality', score: explanationScore, maxScore: 100, evidence: 'Pending AI review' },
        { key: 'risk', label: 'Risk awareness', score: highPriorityMissed.length === 0 ? 100 : 0, maxScore: 100, evidence: highPriorityMissed.length ? `Missed critical records` : 'All critical records prioritized' },
      ],
      skillScores: [],
      redFlags,
      summary: `Ranking score: ${rankScore}%. ${highPriorityMissed.length ? 'Missed critical records.' : 'Critical records identified.'}`,
      scoringMode: 'hybrid',
      confidence: 0.8,
      needsManualReview: redFlags.length > 0,
    };
  },

  async summarizeAnalytics(submissions): Promise<ModuleAnalytics> {
    const scores = submissions.map(s => (s.score as any)?.totalScore ?? 0);
    const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    return { moduleType: 'crm_prioritization', totalSubmissions: submissions.length, averageScore: avg, scoreDistribution: {}, commonRedFlags: [], averageTimeSeconds: 0, completionRate: 1 };
  },
};
