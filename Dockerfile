FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native addons (e.g., better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package manifests (both package.json and package-lock.json)
COPY package*.json ./

# Deterministically install production dependencies from lockfile
RUN npm ci --omit=dev

# Copy application source
COPY . .

EXPOSE 3000
CMD ["node", "server/index.js"]
