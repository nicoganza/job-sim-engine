import { z } from 'zod';
import { StepScore } from '@job-sim/shared';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validate<T>(schema: z.ZodType<T, z.ZodTypeDef, any>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: result.error.errors.map(e => e.message) };
}

export interface SessionScoringContext {
  sessionId: string;
  candidateId: string;
  jobPostingId: string;
  stepIndex: number;
  totalSteps: number;
}

export interface SimulationEventRecord {
  eventType: string;
  payload: unknown;
  createdAt: Date;
}

export interface ModuleAnalytics {
  moduleType: string;
  totalSubmissions: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  commonRedFlags: Array<{ key: string; count: number }>;
  averageTimeSeconds: number;
  completionRate: number;
}

export interface ModuleScoringInput<TConfig, TAnswer> {
  config: TConfig;
  scoringConfig: unknown;
  answer: TAnswer;
  events: SimulationEventRecord[];
  sessionContext: SessionScoringContext;
}

export interface SimulationModule<TConfig, TAnswer> {
  type: string;
  label: string;
  description: string;

  configSchema: z.ZodType<TConfig, z.ZodTypeDef, any>;
  answerSchema: z.ZodType<TAnswer, z.ZodTypeDef, any>;

  validateConfig(config: unknown): ValidationResult<TConfig>;
  validateAnswer(answer: unknown): ValidationResult<TAnswer>;
  getPublicCandidateConfig(config: TConfig): unknown;

  score(input: ModuleScoringInput<TConfig, TAnswer>): Promise<StepScore>;
  summarizeAnalytics(submissions: Array<{ answer: unknown; score: unknown; events: SimulationEventRecord[]; timeSpentSeconds?: number }>): Promise<ModuleAnalytics>;
}
