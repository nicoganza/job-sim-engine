import { z } from 'zod';
import { StepScore } from '@job-sim/shared';
import { SimulationModule, ModuleScoringInput, ModuleAnalytics, validate } from '../types';

const SlackMessageSchema = z.object({
  sender: z.string(),
  role: z.string().optional(),
  avatarInitials: z.string().optional(),
  message: z.string(),
});

const SlideSchema = z.object({
  text: z.string(),
  html: z.string().optional(),
});

const PersonaSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  photoUrl: z.string().optional(),
  voice: z.string().default('ash'),
  voiceInstructions: z.string().optional(),
});

const ConfigSchema = z.object({
  founderName: z.string().nullish(),
  founderRole: z.string().nullish(),
  founderMessage: z.string().nullish(),
  videoUrl: z.string().nullish(),
  slackMessage: SlackMessageSchema.optional(),
  minReadSeconds: z.number().default(15),
  // TTS slide presentation
  persona: PersonaSchema.optional(),
  slides: z.array(SlideSchema).optional(),
});

const AnswerSchema = z.object({
  acknowledged: z.boolean(),
  timeSpentSeconds: z.number(),
  slidesCompleted: z.number().optional(),
});

type Config = z.infer<typeof ConfigSchema>;
type Answer = z.infer<typeof AnswerSchema>;

export const welcomeModule: SimulationModule<Config, Answer> = {
  type: 'welcome',
  label: 'Welcome & Onboarding',
  description: 'Introductory screen with founder message and optional TTS slide presentation.',

  configSchema: ConfigSchema,
  answerSchema: AnswerSchema,

  validateConfig: (c: any) => {
    // Structural check first
    const parsed = ConfigSchema.safeParse(c);
    if (!parsed.success) return { success: false, errors: parsed.error.errors.map(e => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    }) };
    // Semantic check: if in TTS mode, require persona.name and at least one slide
    const hasTts = !!(c?.slides?.length || c?.persona);
    if (hasTts) {
      if (!c.persona?.name?.trim()) return { success: false, errors: ['persona.name: Nome del relatore obbligatorio'] };
      if (!c.slides?.length) return { success: false, errors: ['slides: Aggiungi almeno una slide con testo'] };
      if (c.slides.some((s: any) => !s.text?.trim())) return { success: false, errors: ['slides: Tutte le slide devono avere testo'] };
    }
    return { success: true, data: parsed.data };
  },
  validateAnswer: (a) => validate(AnswerSchema, a),

  getPublicCandidateConfig(config: Config) {
    return {
      founderName: config.founderName,
      founderRole: config.founderRole,
      founderMessage: config.founderMessage,
      videoUrl: config.videoUrl,
      slackMessage: config.slackMessage,
      minReadSeconds: config.minReadSeconds,
      persona: config.persona,
      slides: config.slides,
    };
  },

  async score(input: ModuleScoringInput<Config, Answer>): Promise<StepScore> {
    const { config, answer } = input;
    const minSec = config.minReadSeconds ?? 15;
    const spent = answer.timeSpentSeconds ?? 0;
    const totalSlides = config.slides?.length ?? 0;
    const completed = answer.slidesCompleted ?? 0;

    let engagementScore: number;
    if (totalSlides > 0) {
      engagementScore = totalSlides > 0 ? Math.round((completed / totalSlides) * 100) : 0;
      if (completed === totalSlides) engagementScore = 100;
    } else {
      if (spent >= minSec * 2) engagementScore = 100;
      else if (spent >= minSec) engagementScore = 75;
      else if (spent >= minSec * 0.5) engagementScore = 40;
      else engagementScore = 10;
    }

    const redFlags = spent < 5 ? [{ key: 'skipped_onboarding', severity: 'medium' as const, message: 'Candidate skipped the welcome screen in under 5 seconds' }] : [];

    return {
      stepId: input.sessionContext.sessionId,
      stepType: 'welcome',
      totalScore: answer.acknowledged ? engagementScore : 0,
      maxScore: 100,
      criteria: [
        { key: 'engagement', label: 'Onboarding engagement', score: engagementScore, maxScore: 100, evidence: totalSlides > 0 ? `Completed ${completed}/${totalSlides} slides` : `Read for ${spent}s` },
      ],
      skillScores: [],
      redFlags,
      summary: totalSlides > 0 ? `Completed ${completed}/${totalSlides} presentation slides.` : `Spent ${spent}s on welcome screen.`,
      scoringMode: 'algorithmic',
      confidence: 0.9,
      needsManualReview: false,
    };
  },

  async summarizeAnalytics(submissions): Promise<ModuleAnalytics> {
    const times = submissions.map(s => (s.answer as any)?.timeSpentSeconds ?? 0);
    const avg = times.length ? times.reduce((a: number, b: number) => a + b, 0) / times.length : 0;
    return { moduleType: 'welcome', totalSubmissions: submissions.length, averageScore: avg, scoreDistribution: {}, commonRedFlags: [], averageTimeSeconds: avg, completionRate: 1 };
  },
};
