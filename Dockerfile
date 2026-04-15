FROM node:20-slim

# yt-dlp 및 ffmpeg 설치 (유튜브 오디오 추출에 필요)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && pip3 install yt-dlp --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
