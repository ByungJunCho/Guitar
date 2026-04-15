const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
require('dotenv').config();

// 프로젝트 루트의 .venv Python을 우선 사용 (없으면 시스템 python으로 폴백)
const VENV_PYTHON_WIN  = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
const VENV_PYTHON_UNIX = path.join(__dirname, '.venv', 'bin', 'python');
function getPythonPath() {
  if (fs.existsSync(VENV_PYTHON_WIN))  return VENV_PYTHON_WIN;
  if (fs.existsSync(VENV_PYTHON_UNIX)) return VENV_PYTHON_UNIX;
  return 'python';
}

const app = express();
const port = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 💡 현재 폴더의 index.html과 다른 정적 파일들을 브라우저가 읽을 수 있게 허용
app.use(express.static(__dirname));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 💡 http://localhost:5000 접속 시 index.html 파일을 직접 전송
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "메시지를 입력해주세요." });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          // 💡 마스터 코치 지침(Content)을 수정 없이 그대로 유지했습니다.
          content: `당신은 20년 경력의 월드클래스 기타리스트이자 음악 교육가인 'AI 기타 코치'입니다. 모든 대화는 친절하면서도 전문성이 느껴져야 합니다. 
          사용자의 질문 수준에 맞춰 초보자에게는 친절하게, 고수에게는 전문 용어를 사용하여 깊이 있는 레슨을 제공하세요.

[핵심 지식베이스 및 교육 지침]
1. 코드 및 타브 악보:
   - 모든 코드는 근음(Root)과 프렛 번호를 명시할 것.
   - 하이코드 요청 시 반드시 검지 바레(Barre) 위치와 프렛 번호(e.g., 3f, 8f)를 정확히 기재할 것.
   - 타브 악보 우측에 프렛 위치를 표시하여 가독성을 높일 것.

2. 연주 테크닉 레슨 (심화):
   - 밴딩(Bending/Choking): 음을 올리는 폭(Half, Full step)과 약지/중지를 함께 사용하는 서포트 요령 설명.
   - 비브라토(Vibrato): 손목의 회전력을 이용한 일정하고 부드러운 음의 떨림 구현 방법 조언.
   - 탭핑(Tapping): 오른손 검지/중지를 이용한 타격 지점과 풀링 오프(Pull-off) 연계 동작 설명.
   - 기타 기술(Hammer-on, Pull-off, Sliding, Palm Muting 등) 요청 시 단계별 연습법 제공.

3. 하드웨어 및 관리:
   - 파트 명칭: 헤드(머신헤드), 넥(프렛보드, 트러스로드), 바디(픽업, 브릿지, 셀렉터) 등 각 파트의 역할과 명칭 설명. 
   - 줄 교체: 줄 감는 방향, 브릿지 타입별(고정형 vs 플로팅) 교체 주의사항 안내.
   - 장비 조언: 초보자용 앰프 설정, 이펙터 체인 구성, 피크 두께별 특징 등 가이드.

4. 답변 스타일:
   - 초보자에게는 쉬운 비유를, 고수에게는 음악 이론(인터벌, 스케일 모드 등)을 섞어 설명.
   - 중요한 꿀팁은 반드시 '💡 마스터의 비법' 섹션으로 따로 요약할 것.`
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    res.json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error("OpenAI API 오류 발생:", error.message);
    res.status(500).json({ error: "AI 코치가 응답하는 중 오류가 발생했습니다." });
  }
});

// YouTube 오디오 추출 엔드포인트
app.post('/api/youtube', (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url)) {
    return res.status(400).json({ error: '유효한 유튜브 URL을 입력해주세요.' });
  }

  const tmpBase = path.join(os.tmpdir(), `gtab_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const outputTemplate = `${tmpBase}.%(ext)s`;
  const outputFile = `${tmpBase}.mp3`;

  // yt-dlp 로 오디오만 추출 (최대 10분 제한)
  const args = [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '5',
    '--no-playlist',
    '--match-filter', 'duration<=600',
    '-o', outputTemplate,
    url,
  ];

  execFile('yt-dlp', args, { timeout: 180000 }, (error) => {
    if (error) {
      console.error('yt-dlp 오류:', error.message);
      return res.status(500).json({
        error: 'YouTube 오디오 추출 실패. URL을 확인하거나 서버에 yt-dlp / ffmpeg 가 설치되어 있는지 확인해주세요.',
      });
    }

    fs.readFile(outputFile, (readErr, data) => {
      fs.unlink(outputFile, () => {}); // 임시 파일 정리
      if (readErr) {
        return res.status(500).json({ error: '오디오 파일 처리 중 오류가 발생했습니다.' });
      }
      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Length', data.length);
      res.send(data);
    });
  });
});

// 파일 업로드 설정 (최대 50MB, 오디오 파일만 허용)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || /\.(mp3|wav|m4a)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('mp3, wav, m4a 파일만 업로드할 수 있습니다.'));
    }
  },
});

// 오디오 → 악보(MusicXML) 변환 엔드포인트
app.post('/api/transcribe-to-sheet', upload.single('audio'), async (req, res) => {
  const youtubeUrl = req.body && req.body.youtubeUrl;
  const transcribeScript = path.join(__dirname, 'transcribe.py');

  // transcribe.py 존재 확인
  if (!fs.existsSync(transcribeScript)) {
    return res.status(500).json({ error: 'transcribe.py 파일을 찾을 수 없습니다.' });
  }

  let audioPath = null;
  let tempYtFile = null;

  try {
    if (youtubeUrl) {
      // 유튜브 URL → MP3 추출
      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(youtubeUrl)) {
        return res.status(400).json({ error: '유효한 유튜브 URL을 입력해주세요.' });
      }

      const tmpBase = path.join(os.tmpdir(), `gtab_sheet_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      tempYtFile = `${tmpBase}.mp3`;

      await new Promise((resolve, reject) => {
        const args = [
          '-x', '--audio-format', 'mp3', '--audio-quality', '5',
          '--no-playlist', '--match-filter', 'duration<=600',
          '-o', `${tmpBase}.%(ext)s`, youtubeUrl,
        ];
        execFile('yt-dlp', args, { timeout: 180000 }, (err) => {
          if (err) reject(new Error('YouTube 오디오 추출 실패. yt-dlp / ffmpeg 설치를 확인해주세요.'));
          else resolve();
        });
      });

      audioPath = tempYtFile;
    } else if (req.file) {
      // 업로드된 파일 사용
      audioPath = req.file.path;
    } else {
      return res.status(400).json({ error: '오디오 파일을 업로드하거나 유튜브 URL을 입력해주세요.' });
    }

    // Python 스크립트로 오디오 → MusicXML 변환
    const musicXml = await new Promise((resolve, reject) => {
      const pyEnv = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
      execFile(getPythonPath(), [transcribeScript, audioPath], { timeout: 300000, maxBuffer: 10 * 1024 * 1024, env: pyEnv }, (err, stdout, stderr) => {
        if (err) {
          const msg = stderr || err.message;
          if (msg.includes('No module named')) {
            reject(new Error('basic-pitch 또는 music21 라이브러리가 설치되어 있지 않습니다. 터미널에서 다음 명령어를 실행해주세요:\npip install basic-pitch music21'));
          } else {
            reject(new Error(`변환 오류: ${msg}`));
          }
        } else {
          resolve(stdout);
        }
      });
    });

    res.json({ musicXml });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // 임시 파일 정리
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    if (tempYtFile) fs.unlink(tempYtFile, () => {});
  }
});

app.listen(port, () => {
  console.log(`================================================`);
  console.log(`✅ 서버가 http://localhost:${port} 에서 실행 중입니다.`);
  console.log(`🎸 브라우저에서 위 주소를 입력해 앱을 시작하세요!`);
  console.log(`================================================`);
});