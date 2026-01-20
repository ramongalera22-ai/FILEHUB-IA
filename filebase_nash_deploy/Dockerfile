# Stage 1: Build the React Frontend
FROM node:18-alpine as builder

WORKDIR /app

# Copy root package.json and install frontend dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . .

# Build the frontend (outputs to /app/dist)
# FORCE NASH MODE: Overwrite the default index.tsx with indexNash.tsx
# This ensures we build the version that uses AppNash (Local/SQLite) instead of App (Supabase)
COPY indexNash.tsx ./index.tsx
RUN npm run build

# Stage 2: Setup the Node.js Backend and Serve
FROM node:18-alpine

WORKDIR /app

# Copy backend package.json and install backend dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy backend source code
COPY server/ .

# Copy built frontend assets from builder stage to 'public' folder for the backend to serve
COPY --from=builder /app/dist ./public

# Create directories for persistence
RUN mkdir -p /app/data /app/uploads

# Expose the API/Server port
EXPOSE 8080

# Environment variables (Defaults, can be overridden by docker-compose)
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/uploads

# Start the server
CMD ["node", "index.js"]
