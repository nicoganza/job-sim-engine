import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRouter from './routes/auth';
import publicRouter from './routes/public';
import jobsRouter from './routes/jobs';
import simulationsRouter from './routes/simulations';
import aiRecommendationsRouter from './routes/ai-recommendations';
import candidateRouter from './routes/candidate';
import realtimeCallsRouter from './routes/realtime-calls';
import resultsRouter from './routes/results';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/candidate', candidateRouter);   // must come before /api catch-all mounts
app.use('/api/jobs', jobsRouter);
app.use('/api/simulations', simulationsRouter);
app.use('/api', simulationsRouter); // for /api/jobs/:jobId/simulation routes
app.use('/api/ai-recommendation-runs', aiRecommendationsRouter);
app.use('/api', realtimeCallsRouter);
app.use('/api', resultsRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));

export default app;
