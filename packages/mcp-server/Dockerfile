FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/mcp-server/ packages/mcp-server/
RUN npm ci
RUN npx turbo build --filter=@shipit-ai/mcp-server

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/mcp-server/dist ./dist
COPY --from=builder /app/packages/mcp-server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
