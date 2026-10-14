# --- Multi-stage Production Dockerfile for ICT Forex Terminal ---
FROM node:20-alpine AS base

# Install build tools for better-sqlite3 native compilation
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Dependencies stage
COPY package.json package-lock.json ./
RUN npm ci

# Source & Build stage
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Expose server port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

