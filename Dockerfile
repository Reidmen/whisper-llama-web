# Use Node.js as base image
FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy only package files first
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Create a clean deployment with only dist files
RUN mkdir -p /app/hf-space && \
    cp -r dist/* /app/hf-space/ && \
    cd /app && \
    rm -rf * && \
    mv hf-space/* . && \
    rm -rf hf-space

# Install serve
RUN npm install -g serve

# Expose port 7860
EXPOSE 7860

# Start the server
CMD ["serve", "-s", ".", "-p", "7860"]