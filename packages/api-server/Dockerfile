FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/event-bus/ packages/event-bus/
COPY packages/api-server/ packages/api-server/
RUN npm ci
RUN npx turbo build --filter=@shipit-ai/api-server

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/api-server/dist ./dist
COPY --from=builder /app/packages/api-server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
