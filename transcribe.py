"""
오디오 파일(mp3/wav/m4a)을 MusicXML 악보로 변환합니다.
사용법: python transcribe.py <오디오_파일_경로>
결과:  stdout으로 MusicXML 문자열 출력
"""

import sys
import os
import tempfile

def check_dependencies():
    missing = []
    try:
        import basic_pitch  # noqa: F401
    except ImportError:
        missing.append('basic-pitch')
    try:
        import music21  # noqa: F401
    except ImportError:
        missing.append('music21')
    if missing:
        print(
            f"필수 라이브러리가 없습니다: {', '.join(missing)}\n"
            f"다음 명령어로 설치해주세요:\n"
            f"  pip install basic-pitch music21",
            file=sys.stderr,
        )
        sys.exit(1)


def audio_to_midi(audio_path: str, output_dir: str) -> str:
    """basic-pitch로 오디오 → MIDI 변환, MIDI 파일 경로 반환"""
    from basic_pitch.inference import predict_and_save
    from basic_pitch import ICASSP_2022_MODEL_PATH

    # predict_and_save 가 stdout에 상태 메시지를 출력하므로
    # 실행 중 stdout을 stderr로 리다이렉트해 XML 출력이 오염되지 않도록 한다
    real_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        predict_and_save(
            [audio_path],
            output_directory=output_dir,
            save_midi=True,
            sonify_midi=False,
            save_model_outputs=False,
            save_notes=False,
            model_or_model_path=ICASSP_2022_MODEL_PATH,
        )
    finally:
        sys.stdout = real_stdout

    # basic-pitch는 <원본이름>_basic_pitch.mid 형태로 저장
    base = os.path.splitext(os.path.basename(audio_path))[0]
    midi_path = os.path.join(output_dir, f"{base}_basic_pitch.mid")
    if not os.path.exists(midi_path):
        # fallback: 디렉터리에서 첫 번째 .mid 파일 탐색
        for f in os.listdir(output_dir):
            if f.endswith('.mid'):
                midi_path = os.path.join(output_dir, f)
                break
        else:
            raise FileNotFoundError("MIDI 파일을 생성하지 못했습니다.")
    return midi_path


def midi_to_musicxml(midi_path: str) -> str:
    """music21로 MIDI → MusicXML 변환, MusicXML 문자열 반환"""
    from music21 import converter, tempo

    score = converter.parse(midi_path)

    # 박자 정보가 없으면 기본값 추가
    if not score.flatten().getElementsByClass('TimeSignature'):
        from music21 import meter
        score.measure(1).insert(0, meter.TimeSignature('4/4'))

    # 기본 빠르기 표시 추가
    if not score.flatten().getElementsByClass(tempo.MetronomeMark):
        score.measure(1).insert(0, tempo.MetronomeMark(number=120))

    with tempfile.NamedTemporaryFile(suffix='.xml', delete=False) as tmp:
        tmp_path = tmp.name

    try:
        score.write('musicxml', fp=tmp_path)
        with open(tmp_path, 'r', encoding='utf-8') as f:
            return f.read()
    finally:
        os.unlink(tmp_path)


def main():
    if len(sys.argv) < 2:
        print("사용법: python transcribe.py <오디오_파일_경로>", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(f"파일을 찾을 수 없습니다: {audio_path}", file=sys.stderr)
        sys.exit(1)

    check_dependencies()

    with tempfile.TemporaryDirectory() as tmp_dir:
        midi_path = audio_to_midi(audio_path, tmp_dir)
        music_xml = midi_to_musicxml(midi_path)

    print(music_xml, end='')


if __name__ == '__main__':
    main()
