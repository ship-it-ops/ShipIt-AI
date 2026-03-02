FROM node:22-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/event-bus/ packages/event-bus/
COPY packages/api-server/ packages/api-server/
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@shipit-ai/api-server

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/packages/api-server/dist ./dist
COPY --from=builder /app/packages/api-server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
