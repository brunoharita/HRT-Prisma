FROM node:24-alpine AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-workspace
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json forwarder.mjs server.mjs ./
RUN mkdir -p /var/lib/hrt-mail && chown node:node /var/lib/hrt-mail
USER node
CMD ["node", "server.mjs"]
