const yanggan = ['갑', '병', '무', '경', '임'];
const eumgan = ['을', '정', '기', '신', '계'];

const yangji = ['자', '인', '진', '오', '신', '술'];
const eumji = ['축', '묘', '사', '미', '유', '해'];

const full_gan = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const full_ji = [
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
];

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

    const year_gan = year[0];
    const month_ji = month[1];
    const day_gan = day[0];

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
  } catch (e: any) {
    return `입력 오류: ${e.message}`;
  }
}
