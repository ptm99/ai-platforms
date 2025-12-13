# -----------------------------
# Builder (Node + Vite build)
# -----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# -----------------------------
# Runtime (Nginx serving static files)
# -----------------------------
FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist ./

# Basic nginx config for SPA (React / Vite)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
