FROM node:22-alpine
WORKDIR /app
COPY services/paddle-gateway/gateway.mjs ./gateway.mjs
RUN mkdir -p /run/paddle-gateway && chown node:node /run/paddle-gateway
USER node
CMD ["node", "gateway.mjs"]
