FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
COPY web/src ./web/src
RUN node node_modules/typescript/bin/tsc -p tsconfig.json
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/src/domain/profileSynthesis.js ./dist/src/domain/profileSynthesis.js
COPY --from=build /app/dist/src/infrastructure/aiHistory.js ./dist/src/infrastructure/aiHistory.js
COPY scripts/profile-synthesis-worker.mjs scripts/ai-history-client.mjs scripts/position-assessment-email-worker.mjs ./scripts/
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "const h=JSON.parse(require('fs').readFileSync('/tmp/profile-synthesis-health.json'));process.exit(Date.now()-h.at<150000?0:1)"
CMD ["node", "scripts/profile-synthesis-worker.mjs"]
