# Guitar Coach Pro

기타 튜너, 연습 플레이어, 메트로놈, AI 코치, **타브악보 변환기**를 하나로 묶은 웹 앱.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 실시간 튜너 | 마이크 입력으로 기타 음정 감지 |
| 연습 플레이어 | 속도 조절 + A/B 반복 구간 설정 |
| 메트로놈 | 40~240 BPM |
| AI 마스터 코치 | GPT-4o-mini 기반 기타 레슨 |
| **타브악보 변환기** | MP3 업로드 또는 유튜브 URL → 6줄 TAB 생성 + 편집 |

---

## 로컬 실행

### 사전 요구사항

- Node.js 18+
- Python 3 + pip (유튜브 기능 사용 시)
- yt-dlp + ffmpeg (유튜브 기능 사용 시)

### 설치

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 OPENAI_API_KEY 값을 입력하세요

# 3. yt-dlp 설치 (유튜브 기능 필요 시)
pip install yt-dlp
# ffmpeg도 설치 필요: https://ffmpeg.org/download.html
# Windows: winget install ffmpeg  /  macOS: brew install ffmpeg
```

### 실행

```bash
npm start
# 브라우저에서 http://localhost:5000 접속
```

---

## 배포

### 방법 A: Railway (Express 서버 전체 배포, 권장)

유튜브 기능 포함 전체 앱을 Railway 한 곳에 배포합니다.

1. [railway.app](https://railway.app) 에서 새 프로젝트 생성
2. GitHub 레포지토리 연결 또는 `railway up` CLI 사용
3. 환경 변수 설정:
   - `OPENAI_API_KEY` = your key
   - `PORT` = 5000 (Railway가 자동 설정하기도 함)
4. Railway는 `nixpacks.toml` 을 자동 감지하여 yt-dlp / ffmpeg 를 설치합니다.
5. 배포 완료 후 Railway가 부여한 URL로 접근 가능.

### 방법 B: Render

1. [render.com](https://render.com) 에서 New Web Service 생성
2. Build Command: `npm install && pip3 install yt-dlp`
3. Start Command: `node server.js`
4. Environment > Add environment variables: `OPENAI_API_KEY`
5. Render 인스턴스에는 ffmpeg가 기본 설치되어 있음.

### 방법 C: Docker (Fly.io / 자체 서버)

```bash
# 로컬 Docker 빌드 & 실행
docker build -t guitar-coach .
docker run -p 5000:5000 -e OPENAI_API_KEY=sk-xxx guitar-coach

# Fly.io 배포
fly launch
fly secrets set OPENAI_API_KEY=sk-xxx
fly deploy
```

### 방법 D: 프론트엔드 / 백엔드 분리 배포

유튜브 기능은 서버가 필요하므로 백엔드(Express)는 Railway/Render에 배포하고,
프론트엔드(index.html)만 Netlify/Vercel에 올릴 경우:

1. 백엔드를 Railway/Render에 배포하고 URL을 확인 (예: `https://my-guitar-api.up.railway.app`)
2. `index.html` 최상단 `<script>` 직전에 아래 줄 추가:

```html
<script>window.GUITAR_API_URL = 'https://my-guitar-api.up.railway.app';</script>
```

3. 수정된 `index.html` 을 Netlify/Vercel에 업로드.
4. 백엔드 `server.js` 의 CORS 설정에 프론트엔드 도메인을 추가:

```js
app.use(cors({ origin: 'https://my-guitar-site.netlify.app' }));
```

---

## 타브악보 변환기 사용법

1. 메인 메뉴에서 **타브악보** 버튼 클릭
2. **MP3 업로드** 탭: 파일을 드래그하거나 클릭하여 선택 → BPM 설정 → 변환 시작
3. **유튜브 링크** 탭: URL 붙여넣기 → BPM 설정 → 변환 시작
4. 변환 완료 후:
   - **편집 모드** 버튼으로 셀을 직접 수정 가능 (0~24 또는 빈칸)
   - **초기화** 버튼으로 원래 결과로 되돌리기
   - **+ 마디 추가** 버튼으로 빈 마디 추가
   - **TXT 다운로드** / **복사** 버튼으로 결과 내보내기

> **참고**: 피치 감지는 **단음 연주(멜로디/솔로)** 에 최적화되어 있습니다.
> 코드(화음) 연주의 경우 가장 강한 음만 감지됩니다.

---

## 기술 스택

- **Frontend**: Vanilla JS + HTML5 Web Audio API (피치 감지는 자기상관 알고리즘 내장)
- **Backend**: Node.js + Express
- **AI**: OpenAI GPT-4o-mini
- **유튜브 추출**: yt-dlp + ffmpeg (서버사이드)
- **배포**: Railway / Render / Fly.io (Dockerfile + nixpacks.toml 포함)
