FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./

FROM base AS deps
RUN npm ci

FROM deps AS builder
COPY tsconfig.json jest.config.mjs eslint.config.mjs ./
COPY src ./src
COPY tests ./tests
RUN npx prisma generate --schema src/prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl wget
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma
COPY package*.json ./
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema src/prisma/schema.prisma && node dist/src/app.js"]
