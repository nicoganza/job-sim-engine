import { z } from 'zod';
import { StepScore } from '@job-sim/shared';
import { SimulationModule, ValidationResult, ModuleScoringInput, ModuleAnalytics, validate } from '../types';

const NotificationSchema = z.object({
  id: z.string(),
  senderName: z.string(),
  senderRole: z.string(),
  channel: z.enum(['slack', 'email', 'sms', 'system_alert', 'crm_alert']),
  timestampOffsetMinutes: z.number(),
  message: z.string(),
  visibleMetadata: z.record(z.any()).optional(),
  hiddenUrgency: z.number().min(0).max(100),
  hiddenImportance: z.number().min(0).max(100),
  expectedActionTypes: z.array(z.string()),
  hiddenRationale: z.string(),
});

const ConfigSchema = z.object({
  scenarioContext: z.string(),
  taskPrompt: z.string(),
  notifications: z.array(NotificationSchema),
  allowedActions: z.array(z.enum(['reply', 'ignore', 'escalate', 'schedule_followup', 'create_task', 'ask_clarification'])),
  scoringWeights: z.object({
    actionChoice: z.number(),
    prioritization: z.number(),
    communication: z.number(),
    escalationJudgment: z.number(),
  }),
});

const AnswerSchema = z.object({
  actions: z.array(z.object({
    notificationId: z.string(),
    actionType: z.string(),
    responseText: z.string().optional(),
    priorityRank: z.number().optional(),
  })),
  overallExplanation: z.string().optional(),
});

type Config = z.infer<typeof ConfigSchema>;
type Answer = z.infer<typeof AnswerSchema>;


export const notificationReactionModule: SimulationModule<Config, Answer> = {
  type: 'notification_reaction',
  label: 'Notification Reaction',
  description: 'Candidate handles incoming notifications and chooses appropriate actions.',

  configSchema: ConfigSchema,
  answerSchema: AnswerSchema,

  validateConfig: (c) => validate(ConfigSchema, c),
  validateAnswer: (a) => validate(AnswerSchema, a),

  getPublicCandidateConfig(config: Config) {
    return {
      scenarioContext: config.scenarioContext,
      taskPrompt: config.taskPrompt,
      notifications: config.notifications.map(n => ({
        id: n.id,
        senderName: n.senderName,
        senderRole: n.senderRole,
        channel: n.channel,
        timestampOffsetMinutes: n.timestampOffsetMinutes,
        message: n.message,
        visibleMetadata: n.visibleMetadata,
      })),
      allowedActions: config.allowedActions,
    };
  },

  async score(input: ModuleScoringInput<Config, Answer>): Promise<StepScore> {
    const { config, answer } = input;
    const actionMap = new Map(answer.actions.map(a => [a.notificationId, a]));

    let actionScore = 0;
    let totalPossible = 0;
    const redFlags: StepScore['redFlags'] = [];

    for (const notif of config.notifications) {
      const action = actionMap.get(notif.id);
      const expected = notif.expectedActionTypes;
      totalPossible += notif.hiddenUrgency;

      if (!action) {
        if (notif.hiddenUrgency > 80) {
          redFlags.push({ key: `ignored_${notif.id}`, severity: 'high', message: `Ignored high-urgency notification from ${notif.senderName}` });
        }
        continue;
      }

      if (expected.includes(action.actionType)) {
        actionScore += notif.hiddenUrgency;
      } else if (notif.hiddenUrgency > 80 && action.actionType === 'ignore') {
        redFlags.push({ key: `wrong_action_${notif.id}`, severity: 'high', message: `Chose to ignore critical message from ${notif.senderName}` });
      }
    }

    const normalizedActionScore = totalPossible > 0 ? Math.round((actionScore / totalPossible) * 100) : 0;

    return {
      stepId: input.sessionContext.sessionId,
      stepType: 'notification_reaction',
      totalScore: normalizedActionScore,
      maxScore: 100,
      criteria: [
        { key: 'action_choice', label: 'Action choice', score: normalizedActionScore, maxScore: 100, evidence: `${actionScore}/${totalPossible} urgency points captured` },
        { key: 'communication', label: 'Reply quality', score: 0, maxScore: 100, evidence: 'Pending AI review' },
      ],
      skillScores: [],
      redFlags,
      summary: `Action accuracy: ${normalizedActionScore}%. ${redFlags.length} red flags.`,
      scoringMode: 'hybrid',
      confidence: 0.75,
      needsManualReview: redFlags.some(f => f.severity === 'high'),
    };
  },

  async summarizeAnalytics(submissions): Promise<ModuleAnalytics> {
    const scores = submissions.map(s => (s.score as any)?.totalScore ?? 0);
    const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    return { moduleType: 'notification_reaction', totalSubmissions: submissions.length, averageScore: avg, scoreDistribution: {}, commonRedFlags: [], averageTimeSeconds: 0, completionRate: 1 };
  },
};
