FROM node:22-bookworm-slim

# Install system dependencies: FFmpeg, fonts, openssl, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-liberation \
    fontconfig \
    openssl \
    ca-certificates \
    curl \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including dev dependencies for build
RUN npm ci

# Copy source code and assets
COPY tsconfig.json ./
COPY src ./src/
COPY public ./public/
COPY scripts ./scripts/

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for lean production container
RUN npm prune --production

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
