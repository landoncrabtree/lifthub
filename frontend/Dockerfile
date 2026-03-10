FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM alpine:latest
RUN mkdir -p /app/dist
COPY --from=builder /app/dist /app/dist
