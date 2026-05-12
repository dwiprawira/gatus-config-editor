# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
RUN npm run build

# ── Stage 2: Build Go backend ─────────────────────────────────────────────────
FROM golang:1.22-alpine AS backend-build

WORKDIR /src

# go mod tidy downloads deps and creates/updates go.sum in one step
COPY backend/ .
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

# ── Stage 3: Final image ──────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=backend-build /app/server ./server
COPY --from=frontend-build /frontend/dist ./static

EXPOSE 8000

CMD ["./server"]
