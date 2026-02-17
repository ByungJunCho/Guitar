import React, { useState, useRef, useEffect } from 'react';

const GuitarCoach = () => {
  // --- 상태 관리 ---
  const [chat, setChat] = useState([{ role: 'coach', content: '마스터 코치입니다. 튜닝부터 시작해볼까요?' }]);
  const [input, setInput] = useState("");
  const [isTuning, setIsTuning] = useState(false);
  const [tunerData, setTunerData] = useState({ note: '-', freq: '0.00', diff: 0 });
  const [bpm, setBpm] = useState(120);
  const [isMetroRunning, setIsMetroRunning] = useState(false);

  // --- Ref 관리 ---
  const audioCtxRef = useRef(null);
  const pitchRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(null);

  const guitarNotes = [
    { n: 'E2', f: 82.41 }, { n: 'A2', f: 110.00 }, { n: 'D3', f: 146.83 },
    { n: 'G3', f: 196.00 }, { n: 'B3', f: 246.94 }, { n: 'E4', f: 329.63 }
  ];

  // --- 1. 튜너 로직 (Pitch Detection) ---
  const startTuning = async () => {
    if (isTuning) {
      stopTuning();
      return;
    }

    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // ml5는 전역객체로 로드되어 있어야 합니다 (index.html에 script 태그 추가 필요)
      const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
      pitchRef.current = window.ml5.pitchDetection(modelUrl, audioCtxRef.current, stream, () => {
        setIsTuning(true);
        getPitch();
      });
    } catch (err) {
      alert("마이크 권한이 필요합니다.");
    }
  };

  const stopTuning = () => {
    setIsTuning(false);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setTunerData({ note: '-', freq: '0.00', diff: 0 });
  };

  const getPitch = () => {
    if (!pitchRef.current) return;
    pitchRef.current.getPitch((err, frequency) => {
      if (frequency) {
        const closest = guitarNotes.reduce((a, b) => Math.abs(b.f - frequency) < Math.abs(a.f - frequency) ? b : a);
        setTunerData({
          note: closest.n,
          freq: frequency.toFixed(2),
          diff: frequency - closest.f
        });
      }
      requestRef.current = requestAnimationFrame(getPitch);
    });
  };

  useEffect(() => {
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // --- (기존 메트로놈 및 챗봇 로직은 동일하게 유지) ---
  // ... (이전 코드의 askCoach, toggleMetronome 등)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      
      <div className="left-panel">
        {/* 튜너 UI */}
        <div style={{ background: '#222', color: '#fff', padding: '20px', borderRadius: '15px', textAlign: 'center', marginBottom: '20px' }}>
          <h4 style={{ margin: 0, color: '#aaa' }}>TUNER</h4>
          <div style={{ fontSize: '48px', margin: '10px 0' }}>{tunerData.note}</div>
          <div style={{ fontSize: '14px', color: '#888' }}>{tunerData.freq} Hz</div>
          
          {/* 게이지 시각화 */}
          <div style={{ width: '100%', height: '8px', background: '#444', borderRadius: '4px', position: 'relative', marginTop: '15px' }}>
            <div style={{ 
              position: 'absolute', 
              left: `${50 + (tunerData.diff * 5)}%`, 
              width: '4px', height: '100%', 
              background: Math.abs(tunerData.diff) < 0.6 ? '#28a745' : '#dc3545',
              transition: '0.1s' 
            }} />
          </div>
          
          <button onClick={startTuning} style={{ marginTop: '20px', width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: isTuning ? '#dc3545' : '#444', color: '#fff', cursor: 'pointer' }}>
            {isTuning ? 'TUNER OFF' : 'TUNER ON'}
          </button>
        </div>
        
        {/* (메트로놈 및 플레이어 카드 위치) */}
      </div>

      <div className="right-panel">
        {/* (챗봇 카드 위치) */}
      </div>
    </div>
  );
};

export default GuitarCoach;