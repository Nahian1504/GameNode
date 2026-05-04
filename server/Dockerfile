FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy all server source code
COPY . .

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Switch to non-root user
USER appuser

# Document the port the app uses
EXPOSE 5000

# Health check 
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "index.js"]
