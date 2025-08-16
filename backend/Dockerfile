# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Remove unnecessary files
RUN rm -rf node_modules/*/test* \
           node_modules/*/docs* \
           node_modules/*/*.md \
           node_modules/*/examples*

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S vocastant -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=vocastant:nodejs /app .

# Remove development files
RUN rm -f Dockerfile .dockerignore

# Switch to non-root user
USER vocastant

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]