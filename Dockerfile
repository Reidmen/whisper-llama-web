# Build stage
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install serve to run the built application
RUN npm install -g serve

# Copy only the built files from builder stage
COPY --from=builder /app/dist ./dist

# Remove unnecessary files
RUN rm -rf src node_modules

# Expose port 7860
EXPOSE 7860

# Start the application
CMD ["serve", "-s", "dist", "-p", "7860"]
