-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "remotePolicy" TEXT,
    "seniority" TEXT,
    "employmentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdByUserId" TEXT NOT NULL,
    "activeSimulationId" TEXT,
    "activeSimulationVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "source" TEXT,
    "invitedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobPostingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdByUserId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_steps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "timeLimitSeconds" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "scoringConfig" JSONB,
    "skillMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_assets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "simulationVersionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "currentStepId" TEXT,
    "sessionToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_submissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "simulationVersionId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "timeSpentSeconds" INTEGER,
    "answer" JSONB NOT NULL,
    "score" JSONB,
    "scoringStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stepId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_results" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "simulationVersionId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION,
    "recommendation" TEXT,
    "skillScores" JSONB,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "redFlags" JSONB,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_reviews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "submissionId" TEXT,
    "resultId" TEXT,
    "reviewerUserId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "decision" TEXT,
    "notes" TEXT,
    "overridePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_evaluation_traces" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "relatedEntityType" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "redactedInput" JSONB,
    "output" JSONB NOT NULL,
    "latencyMs" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_evaluation_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendation_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobPostingId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "inputJobPost" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime_call_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "submissionId" TEXT,
    "stepId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "personaConfig" JSONB NOT NULL,
    "hiddenObjections" JSONB NOT NULL,
    "publicContext" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "transcript" JSONB,
    "callMetrics" JSONB,
    "outcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtime_call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime_call_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "realtimeCallSessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtime_call_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "candidates_organizationId_idx" ON "candidates"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_organizationId_email_key" ON "candidates"("organizationId", "email");

-- CreateIndex
CREATE INDEX "job_postings_organizationId_idx" ON "job_postings"("organizationId");

-- CreateIndex
CREATE INDEX "applications_organizationId_idx" ON "applications"("organizationId");

-- CreateIndex
CREATE INDEX "applications_jobPostingId_idx" ON "applications"("jobPostingId");

-- CreateIndex
CREATE INDEX "applications_candidateId_idx" ON "applications"("candidateId");

-- CreateIndex
CREATE INDEX "simulations_organizationId_idx" ON "simulations"("organizationId");

-- CreateIndex
CREATE INDEX "simulation_steps_organizationId_idx" ON "simulation_steps"("organizationId");

-- CreateIndex
CREATE INDEX "simulation_steps_simulationId_idx" ON "simulation_steps"("simulationId");

-- CreateIndex
CREATE INDEX "scenario_assets_organizationId_idx" ON "scenario_assets"("organizationId");

-- CreateIndex
CREATE INDEX "scenario_assets_simulationId_idx" ON "scenario_assets"("simulationId");

-- CreateIndex
CREATE INDEX "simulation_versions_organizationId_idx" ON "simulation_versions"("organizationId");

-- CreateIndex
CREATE INDEX "simulation_versions_simulationId_idx" ON "simulation_versions"("simulationId");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_sessions_sessionToken_key" ON "simulation_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "simulation_sessions_organizationId_idx" ON "simulation_sessions"("organizationId");

-- CreateIndex
CREATE INDEX "simulation_sessions_applicationId_idx" ON "simulation_sessions"("applicationId");

-- CreateIndex
CREATE INDEX "simulation_sessions_candidateId_idx" ON "simulation_sessions"("candidateId");

-- CreateIndex
CREATE INDEX "step_submissions_organizationId_idx" ON "step_submissions"("organizationId");

-- CreateIndex
CREATE INDEX "step_submissions_sessionId_idx" ON "step_submissions"("sessionId");

-- CreateIndex
CREATE INDEX "step_submissions_candidateId_idx" ON "step_submissions"("candidateId");

-- CreateIndex
CREATE INDEX "simulation_events_organizationId_idx" ON "simulation_events"("organizationId");

-- CreateIndex
CREATE INDEX "simulation_events_sessionId_idx" ON "simulation_events"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_results_sessionId_key" ON "candidate_results"("sessionId");

-- CreateIndex
CREATE INDEX "candidate_results_organizationId_idx" ON "candidate_results"("organizationId");

-- CreateIndex
CREATE INDEX "candidate_results_jobPostingId_idx" ON "candidate_results"("jobPostingId");

-- CreateIndex
CREATE INDEX "candidate_results_candidateId_idx" ON "candidate_results"("candidateId");

-- CreateIndex
CREATE INDEX "manual_reviews_organizationId_idx" ON "manual_reviews"("organizationId");

-- CreateIndex
CREATE INDEX "ai_evaluation_traces_organizationId_idx" ON "ai_evaluation_traces"("organizationId");

-- CreateIndex
CREATE INDEX "ai_evaluation_traces_relatedEntityId_idx" ON "ai_evaluation_traces"("relatedEntityId");

-- CreateIndex
CREATE INDEX "ai_recommendation_runs_organizationId_idx" ON "ai_recommendation_runs"("organizationId");

-- CreateIndex
CREATE INDEX "ai_recommendation_runs_jobPostingId_idx" ON "ai_recommendation_runs"("jobPostingId");

-- CreateIndex
CREATE INDEX "realtime_call_sessions_organizationId_idx" ON "realtime_call_sessions"("organizationId");

-- CreateIndex
CREATE INDEX "realtime_call_sessions_sessionId_idx" ON "realtime_call_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "realtime_call_events_organizationId_idx" ON "realtime_call_events"("organizationId");

-- CreateIndex
CREATE INDEX "realtime_call_events_realtimeCallSessionId_idx" ON "realtime_call_events"("realtimeCallSessionId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_steps" ADD CONSTRAINT "simulation_steps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_steps" ADD CONSTRAINT "simulation_steps_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_assets" ADD CONSTRAINT "scenario_assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_assets" ADD CONSTRAINT "scenario_assets_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_versions" ADD CONSTRAINT "simulation_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_versions" ADD CONSTRAINT "simulation_versions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_versions" ADD CONSTRAINT "simulation_versions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_simulationVersionId_fkey" FOREIGN KEY ("simulationVersionId") REFERENCES "simulation_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_submissions" ADD CONSTRAINT "step_submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_submissions" ADD CONSTRAINT "step_submissions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_submissions" ADD CONSTRAINT "step_submissions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_submissions" ADD CONSTRAINT "step_submissions_simulationVersionId_fkey" FOREIGN KEY ("simulationVersionId") REFERENCES "simulation_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_events" ADD CONSTRAINT "simulation_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_events" ADD CONSTRAINT "simulation_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_results" ADD CONSTRAINT "candidate_results_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_results" ADD CONSTRAINT "candidate_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_results" ADD CONSTRAINT "candidate_results_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_results" ADD CONSTRAINT "candidate_results_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_results" ADD CONSTRAINT "candidate_results_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_results" ADD CONSTRAINT "candidate_results_simulationVersionId_fkey" FOREIGN KEY ("simulationVersionId") REFERENCES "simulation_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_reviews" ADD CONSTRAINT "manual_reviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_reviews" ADD CONSTRAINT "manual_reviews_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_reviews" ADD CONSTRAINT "manual_reviews_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "step_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_reviews" ADD CONSTRAINT "manual_reviews_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "candidate_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluation_traces" ADD CONSTRAINT "ai_evaluation_traces_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendation_runs" ADD CONSTRAINT "ai_recommendation_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendation_runs" ADD CONSTRAINT "ai_recommendation_runs_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendation_runs" ADD CONSTRAINT "ai_recommendation_runs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_call_sessions" ADD CONSTRAINT "realtime_call_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_call_sessions" ADD CONSTRAINT "realtime_call_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_call_sessions" ADD CONSTRAINT "realtime_call_sessions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "step_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_call_events" ADD CONSTRAINT "realtime_call_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_call_events" ADD CONSTRAINT "realtime_call_events_realtimeCallSessionId_fkey" FOREIGN KEY ("realtimeCallSessionId") REFERENCES "realtime_call_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

