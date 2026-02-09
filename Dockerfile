# Dockerfile for Coolify Deployment
# This builds the Vite frontend and runs an Express server for API routes

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# ============================================
# Production image
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Install additional production dependencies for the server
RUN npm install express cors dotenv

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy API routes (these will be served by Express)
COPY --from=builder /app/api ./api

# Copy the server file
COPY server.js ./

# Expose port (Coolify will map this)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Start the Express server
CMD ["node", "server.js"]
