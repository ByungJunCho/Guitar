const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path'); // 파일 경로 처리를 위해 필수
require('dotenv').config();

const app = express();
const port = 5000;

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

app.listen(port, () => {
  console.log(`================================================`);
  console.log(`✅ 서버가 http://localhost:${port} 에서 실행 중입니다.`);
  console.log(`🎸 브라우저에서 위 주소를 입력해 앱을 시작하세요!`);
  console.log(`================================================`);
});