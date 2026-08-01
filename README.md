# Mindful English - AI Sentence Drill & Reading Practice

Mindful English는 Gemini 3.6 Flash AI 기반의 영문 문장 패턴 분석 및 마인드풀니스 영문 독해 습관 형성 애플리케이션입니다.

## 주요 기능

- 🧘 **마인드풀 영어 독해 & 루틴**: 영문 명언, 지혜의 문구, 사용자 입력 문장의 호흡 기반 독해 및 필사
- 🧠 **AI 실시간 드릴 생성 (Gemini 3.6 Flash)**: 문장의 문법적 구조, 시제, 조동사, 가주어/조건절 등을 분석하여 동일 문법 패턴의 5가지 응용 연습 문장 및 한국어 해설, 워드 스크램블 퀴즈 생성
- ⚡ **서버리스 & Netlify 호환**: Express 서버(로컬 dev) 및 Netlify Functions(Netlify 정적/서버리스 배포) 양방향 지원

---

## 프로젝트 구성

- `server.ts`: Express + Vite 개발 서버 핸들러
- `netlify/functions/generate-drills.ts`: Netlify 서버리스 백엔드 Function 핸들러
- `src/lib/geminiDrillService.ts`: Gemini 3.6 Flash AI 호출 및 자동 재시도, 로컬 폴백 공용 서비스
- `src/lib/drillGenerator.ts`: 로컬 동적 문장 구조 분석기 및 한국어 번역 검증 엔진

---

## Netlify 배포 방법 (Netlify Deployment)

Netlify 정적 배포 환경에서도 `/api/generate-drills` 요청이 Netlify Functions를 통해 정상적으로 Gemini API와 통신합니다.

### 1. GitHub 저장소 연결
1. Netlify 콘솔에서 **Add new site > Import an existing project**를 선택합니다.
2. GitHub 저장소를 연결합니다.

### 2. 빌드 설정 (Build Settings)
`netlify.toml` 파일에 설정이 미리 포함되어 있어 자동 감지됩니다:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3. Gemini API Key 환경변수 설정
Netlify에 배포된 애플리케이션에서 Gemini API를 활성화하려면:
1. Netlify Site 대시보드에서 **Site configuration > Environment variables**로 이동합니다.
2. **Add a variable** 클릭 후:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: 발급받은 Gemini API Key 입력
3. 변경사항 저장 후 사이트를 **Re-deploy**합니다.

---

## 로컬 개발 실행 (Local Development)

```bash
# 1. 의존성 설치
npm install

# 2. .env 파일에 GEMINI_API_KEY 설정 (선택 사항)
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env

# 3. 개발 서버 실행 (포트 3000)
npm run dev
```
