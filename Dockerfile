FROM node:20-slim

# yt-dlp, ffmpeg 및 필요한 패키지(basic-pitch, music21 포함) 설치
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && pip3 install --no-cache-dir -U yt-dlp mutagen certifi basic-pitch music21 --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]