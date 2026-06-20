import { Worker } from 'bullmq';
import { redis } from './lib/redis';
import { processScoringJob } from './processors/scoring';
import { processAiRecommendationJob } from './processors/ai-recommendations';
import { processAnalyticsJob } from './processors/analytics';
import { processAiFillJob } from './processors/ai-fill';

const { host = 'localhost', port = 6379, password, username } = redis.options as any;
const connection = { host, port, password, username };

const scoringWorker = new Worker('scoring', processScoringJob, {
  connection,
  concurrency: 5,
});

const aiRecommendationWorker = new Worker('ai-recommendations', processAiRecommendationJob, {
  connection,
  concurrency: 2,
});

const analyticsWorker = new Worker('analytics', processAnalyticsJob, {
  connection,
  concurrency: 1,
});

const aiFillWorker = new Worker('ai-fill', processAiFillJob, {
  connection,
  concurrency: 3,
});

for (const worker of [scoringWorker, aiRecommendationWorker, analyticsWorker, aiFillWorker]) {
  worker.on('completed', job => console.log(`[${job.queueName}] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[${job?.queueName}] Job ${job?.id} failed:`, err.message));
}

console.log('Worker started. Listening on queues: scoring, ai-recommendations, analytics, ai-fill');

process.on('SIGTERM', async () => {
  await Promise.all([scoringWorker.close(), aiRecommendationWorker.close(), analyticsWorker.close(), aiFillWorker.close()]);
  process.exit(0);
});
