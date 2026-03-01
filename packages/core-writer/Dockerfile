FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/event-bus/ packages/event-bus/
COPY packages/core-writer/ packages/core-writer/
RUN npm ci
RUN npx turbo build --filter=@shipit-ai/core-writer

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/core-writer/dist ./dist
COPY --from=builder /app/packages/core-writer/package.json ./
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
