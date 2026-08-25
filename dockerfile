FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates python3 python3-pip && rm -rf /var/lib/apt/lists/* \
 && pip3 install --no-cache-dir --break-system-packages -U yt-dlp
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/extract.js ./
RUN mkdir -p public
ENV PORT=10000
EXPOSE 10000
CMD ["node", "extract.js"]
