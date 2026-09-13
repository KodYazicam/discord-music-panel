FROM node:20-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates python3-dev build-essential \
    && pip3 install --break-system-packages --no-cache-dir yt-dlp \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev \
    && apt-get purge -y python3-dev build-essential \
    && apt-get autoremove -y \
    && useradd --create-home --uid 10001 panel
COPY src ./src
COPY --from=frontend /app/frontend/dist ./frontend/dist
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
VOLUME ["/app/data", "/app/logs"]
USER 10001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]
