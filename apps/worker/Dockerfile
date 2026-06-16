FROM node:22-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc pnpm.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/simulation-modules/package.json ./packages/simulation-modules/
COPY packages/scoring/package.json ./packages/scoring/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @job-sim/shared build
RUN pnpm --filter @job-sim/simulation-modules build
RUN pnpm --filter @job-sim/scoring build
RUN pnpm --filter @job-sim/worker build
RUN node_modules/.bin/prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

CMD ["node", "apps/worker/dist/main.js"]
