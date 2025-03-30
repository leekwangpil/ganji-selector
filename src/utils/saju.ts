const yanggan = ['갑', '병', '무', '경', '임'];
const eumgan = ['을', '정', '기', '신', '계'];

const yangji = ['자', '인', '진', '오', '신', '술'];
const eumji = ['축', '묘', '사', '미', '유', '해'];

export const full_gan = [
  '갑',
  '을',
  '병',
  '정',
  '무',
  '기',
  '경',
  '신',
  '임',
  '계',
] as const;
export const full_ji = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
] as const;

export type Gan = (typeof full_gan)[number];
export type Ji = (typeof full_ji)[number];

// 24절기 목록
const seasonalTerms = [
  '입춘',
  '우수',
  '경칩',
  '춘분',
  '청명',
  '곡우',
  '입하',
  '소만',
  '망종',
  '하지',
  '소서',
  '대서',
  '입추',
  '처서',
  '백로',
  '추분',
  '한로',
  '상강',
  '입동',
  '소설',
  '대설',
  '동지',
  '소한',
  '대한',
];

// 연도에서 60갑자 계산
export function getGanjiFromYear(year: number): string {
  const baseYear = 1984; // 기준: 갑자년
  const offset = (year - baseYear + 60) % 60;
  return full_gan[offset % 10] + full_ji[offset % 12];
}

// 60갑자에서 해당하는 연도들 찾기
export function getYearsFromGanji(
  ganji: string,
  start = 1900,
  end = 2099
): number[] {
  const years: number[] = [];
  for (let year = start; year <= end; year++) {
    if (getGanjiFromYear(year) === ganji) {
      years.push(year);
    }
  }
  return years;
}

// 60갑자 기준으로 현재 절기 계산
export function getSeasonalTermsByGanji(
  baseGanji: string,
  currentYear: number
): [string, string] {
  const baseYears = getYearsFromGanji(baseGanji, 1900, 2099);
  if (baseYears.length === 0) {
    throw new Error('입력된 60갑자가 유효하지 않습니다.');
  }

  const baseYear = baseYears[baseYears.length - 1]; // 가장 가까운 기준연도
  const elapsedFromIpchun = currentYear - baseYear;
  const elapsedFromIpchu = currentYear - (baseYear + 30);

  const index1 = Math.floor((((elapsedFromIpchun % 60) + 60) % 60) / 2.5);
  const index2 = Math.floor((((elapsedFromIpchu % 60) + 60) % 60) / 2.5);

  const term1 = seasonalTerms[index1 % 24];
  const term2 = seasonalTerms[index2 % 24];

  return [term1, term2];
}

export function analyzeSaju(
  year: string,
  month: string,
  day: string,
  gender: string
): string {
  try {
    if (year.length < 2 || month.length < 2 || day.length < 2) {
      throw new Error('올바른 연도, 월, 일을 입력하세요.');
    }

    const year_gan = year[0] as Gan;
    const month_ji = month[1] as Ji;
    const day_gan = day[0] as Gan;

    if (
      !full_gan.includes(year_gan) ||
      !full_ji.includes(month_ji) ||
      !full_gan.includes(day_gan)
    ) {
      throw new Error('잘못된 천간 또는 지지 입력입니다.');
    }

    const is_single_pillar =
      (yanggan.includes(day_gan) && yangji.includes(month_ji)) ||
      (eumgan.includes(day_gan) && eumji.includes(month_ji));

    if (is_single_pillar) {
      return `당신의 입춘 또는 입추는 ${day_gan}${month_ji}입니다.`;
    }

    const month_ji_index = full_ji.indexOf(month_ji);
    const next_month_ji = full_ji[(month_ji_index + 1) % 12];
    const prev_month_ji = full_ji[(month_ji_index - 1 + 12) % 12];

    let result: string;
    if (gender === '남자') {
      result = yanggan.includes(year_gan)
        ? `${day_gan}${next_month_ji}`
        : `${day_gan}${prev_month_ji}`;
    } else {
      result = yanggan.includes(year_gan)
        ? `${day_gan}${prev_month_ji}`
        : `${day_gan}${next_month_ji}`;
    }

    return `당신의 입춘 또는 입추는 ${result}입니다.`;
  } catch (e: unknown) {
    if (e instanceof Error) {
      return `입력 오류: ${e.message}`;
    }
    return '알 수 없는 오류가 발생했습니다.';
  }
}
