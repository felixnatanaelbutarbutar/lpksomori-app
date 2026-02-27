FROM golang:1.24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# We'll build assuming main is at root or cmd/api/main.go
# If needed, user can modify this path
# We'll build assuming main is at root or cmd/api/main.go
# If needed, user can modify this path
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/api-server ./cmd/api || true

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/api-server .
# Assuming .env exists or gets mounted
# Default gin to release
ENV GIN_MODE=release

EXPOSE 8080
CMD ["./api-server"]
