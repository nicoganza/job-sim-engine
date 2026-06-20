import { Queue } from 'bullmq';
import { redis } from './redis';

const { host, port, password, username } = redis.options as any;
const connection = { host, port, password, username };

export const scoringQueue = new Queue('scoring', { connection });
export const aiRecommendationQueue = new Queue('ai-recommendations', { connection });
export const analyticsQueue = new Queue('analytics', { connection });
export const aiFillQueue = new Queue('ai-fill', { connection });
