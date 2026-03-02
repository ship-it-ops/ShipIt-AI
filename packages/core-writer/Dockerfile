FROM node:20-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/event-bus/ packages/event-bus/
COPY packages/core-writer/ packages/core-writer/
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@shipit-ai/core-writer

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/core-writer/dist ./dist
COPY --from=builder /app/packages/core-writer/package.json ./
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
