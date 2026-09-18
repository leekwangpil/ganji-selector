# 만세력 · 자연순환 사이클

기존 `leekwangpil/ganji-selector`에 만세력 계산과 자연순환 사이클 비교 기능을 통합한 Next.js 프로젝트입니다.

## 포함된 기능

- 생일 기준 위에 선택 사항인 이름 입력란, 계산 결과에 이름 표시
- 양력 / 한국 음력 / 윤달 선택, 양력·음력 변환 결과 표시
- 연·월·일·시주 계산과 출생 시간 모름 처리
- 월·일을 한 입력란에서 직접 타이핑하거나 브라우저의 목록으로 선택
- 연도 → 월 → 일 → 시 → 분 자동 이동, 삭제·수정·한글 조합 중에는 이동하지 않음
- 한국 과거 표준시·서머타임 반영, 해외 UTC 시차 및 경도 입력
- 표준시 / 동경 127.5° / 경도 보정과 23시 / 야자시·조자시 / 0시 경계 선택
- 입춘인 경우와 입추인 경우의 24절기 사이클을 나란히 표시
- 한 사이클 60년, 한 절기 2.5년, 각 절기에 60년 간격 연도 두 개 표시
- 결과 아래에서 `입춘인 경우가 더 적합` / `입추인 경우가 더 적합` / `아직 판단 불가능` 중 하나 선택
- 선택란 제목은 계산된 간지에 따라 `갑인년이` 등의 형식으로 표시
- 기존 간지 직접 선택 화면 유지: `/manual`

선택 항목은 처음에 비어 있습니다. 입력을 바꾸거나 다시 계산하면 이전 선택을 초기화합니다. 계산과 선택은 브라우저 안에서 처리하며, 입력값을 서버·DB·브라우저 저장소에 저장하지 않습니다. 페이지를 새로 열면 사라집니다.

## 실행

Node.js 22 이상이 필요합니다. Cursor에서 이 폴더를 열고 터미널에서 실행합니다.

```sh
npm ci
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

```sh
npm test          # 계산·음력·입력·사이클·React 통합 검증
npm run typecheck
npm run build    # 배포용 빌드
npm start        # 빌드한 프로그램 실행
```

## GitHub에 올리기

압축파일 안 `ganji-selector` 폴더의 **내용물**이 저장소의 최상위에 오도록 올립니다. `package.json`과 `src` 폴더가 같은 위치에 있어야 합니다. 기존 저장소를 업데이트할 때는 수정 전 코드를 보관하고 별도 브랜치에서 먼저 확인하는 것이 편리합니다.

`node_modules`, `.next`, `.env` 파일은 올리지 않습니다. `.gitignore`가 포함되어 있습니다.

Vercel에서는 이 GitHub 저장소를 Next.js 프로젝트로 연결하면 됩니다. 빌드 명령은 `npm run build`, 설치 명령은 `npm ci`이며, 이 기능을 실행하기 위한 API 키나 환경변수는 없습니다. GitHub와 연결된 Vercel 프로젝트는 브랜치 설정에 따라 업로드 후 자동 배포될 수 있습니다.

## 계산 기준과 확인 범위

**원광 만세력과 전체 날짜·설정에 대해 동일하다고 검증된 프로그램은 아닙니다.** 원광 기본 시간 보정 및 자시 처리 설정이 확인되지 않아 사용자가 계산 기준을 직접 선택합니다.

- 지원 날짜: 양력 `1910.01.01~2050.12.31`, 한국 음력 `1909.11.20~2050.11.18`.
- 음력 변환: `korean-lunar-calendar@0.4.0`. 사주 계산에는 변환한 양력 날짜를 사용합니다.
- 절입 시각: `lunar-javascript@1.7.7`의 천문 계산값. 중국 음력 변환 결과를 한국 음력 입력에 사용하지 않습니다.
- 한국 시간대: IANA `Asia/Seoul`, `2025b`의 고정 데이터. 향후 시간대 규칙이 변경되면 데이터 갱신이 필요합니다.
- 경도 보정은 평태양시이며 균시차를 포함하지 않습니다.
- 초를 입력받지 않으므로, 입력한 1분 안에 절입 경계가 있으면 가능한 명식을 모두 표시합니다. 출생 시각을 모를 때도 가능한 명식을 함께 표시합니다.
- 자연순환 계산은 사용자가 정한 **60년 / 24절기 / 한 절기 2.5년** 규칙입니다. 연도 표는 실제 천문 절입 날짜를 뜻하지 않습니다.
- 각 절기의 두 연도는 **양력 출생연도 이상, 출생연도+120 미만** 범위의 해당 간지 연도입니다. 표는 절기 순서이며 첫 번째 연도 열 전체가 시간순으로 정렬되는 것은 아닙니다.
- `+0.5년`은 표시한 간지 기준점에서 반년 뒤를 뜻합니다. 임의의 월·일을 지정하지 않습니다.

자동 검증은 공개된 한국천문연구원 표본, 날짜 경계·시간대 처리, 라이브러리와의 비교 및 DOM/React 동작 검증입니다. 모든 날짜의 원광 일치 검증이나 실제 브라우저의 목록 팝업 검증을 대신하지 않습니다.

참고 자료:

- [한국천문연구원 월별 음양력](https://astro.kasi.re.kr/life/pageView/5)
- [한국천문연구원 월력요항](https://astro.kasi.re.kr/kor/life/post/calendarData)
- [Korean Lunar Calendar](https://github.com/usingsky/korean_lunar_calendar_js)
- [lunar-javascript](https://github.com/6tail/lunar-javascript)
- [IANA 한국 시간대 원자료](https://data.iana.org/time-zones/tzdb/asia)

Next.js는 기존 15 계열을 유지하며 `15.5.25`로 갱신했습니다. [2026년 8월 공식 보안 수정 안내](https://nextjs.org/blog/august-2026-security-release)의 15.5.24 이후 버전입니다.

## 코드 위치

- `src/app/page.tsx`: 생년월일 입력 화면
- `src/app/manual/page.tsx`: 기존 간지 직접 선택 화면
- `src/components/manse/CalculatorMarkup.tsx`: 입력·결과 영역
- `src/components/manse/controller.js`: 입력, 자동 이동, 결과·선택란 렌더링
- `src/components/manse/ManseCalculator.tsx`: React 연결 및 이벤트 정리
- `src/lib/manse/engine.js`: 사주팔자·자연순환 계산
- `src/lib/manse/calendar-adapter.js`: 한국 음력 변환과 날짜 검증
- `src/lib/manse/natural-cycles.js`: 두 가지 사이클·두 연도
- `src/lib/manse/timezone.json`: 한국 시간대 데이터
- `tests/`: 실제 프로젝트 소스를 대상으로 하는 검증

계산 라이브러리의 이용 조건은 `THIRD_PARTY_NOTICES.md`를 참고하세요.
