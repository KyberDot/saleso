# ── Stage 1: Build Frontend ──────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# VITE_API_URL left empty = relative URLs, works with any domain
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend + Serve Frontend ───────────────────────
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ vips-dev

COPY backend/package*.json ./
RUN npm install --omit=dev

RUN mkdir -p /app/data /app/uploads /app/public

# Copy built frontend into backend's public folder
COPY --from=frontend-builder /frontend/dist /app/public

COPY backend/src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]
