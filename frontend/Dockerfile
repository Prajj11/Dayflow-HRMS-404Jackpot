FROM node:22-alpine AS builder
WORKDIR /src
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/package.json ./
COPY serve.mjs ./
EXPOSE 3000
ENV PORT=3000
CMD ["node", "serve.mjs"]
