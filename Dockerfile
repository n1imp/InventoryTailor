# Base stage for dependencies
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/

# Development stage
FROM base AS development
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-slim AS production
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV DATABASE_PROVIDER=postgresql
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/server.ts ./
COPY --from=build /app/node_modules ./node_modules
# Note: In production we'd normally compile server.ts to JS, 
# but for this environment we'll use tsx to run the TS file directly as per instructions.
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
