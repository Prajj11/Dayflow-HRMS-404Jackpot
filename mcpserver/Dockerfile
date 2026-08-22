FROM golang:1.25-alpine AS builder
ENV GOTOOLCHAIN=auto
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /out/mcpserver .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/mcpserver .
EXPOSE 8081
ENV PORT=8081
CMD ["./mcpserver"]
