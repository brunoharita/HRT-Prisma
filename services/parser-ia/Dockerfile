FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY services/parser-ia/tsconfig.json ./services/parser-ia/tsconfig.json
COPY src ./src
COPY web/src ./web/src
RUN node node_modules/typescript/bin/tsc -p services/parser-ia/tsconfig.json

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile \
    && mkdir -p /var/lib/prisma/parser-ia /run/parser-ia \
    && chown node:node /var/lib/prisma/parser-ia /run/parser-ia \
    && chmod 700 /var/lib/prisma/parser-ia /run/parser-ia
COPY --from=build /app/dist ./dist
COPY scripts/parser-ia-service.mjs scripts/start-parser-ia-hosted.mjs scripts/check-parser-ia-hosted.mjs ./scripts/
USER node
CMD ["node", "scripts/start-parser-ia-hosted.mjs"]
