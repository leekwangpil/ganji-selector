'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { analyzeSaju, getSeasonalTermsByGanji, Gan, Ji } from '@/utils/saju';

interface SajuSelectorProps {
  onAnalysisComplete?: (result: string) => void;
}

export function SajuSelector({ onAnalysisComplete }: SajuSelectorProps) {
  const [yearGan, setYearGan] = useState<Gan | undefined>();
  const [yearJi, setYearJi] = useState<Ji | undefined>();
  const [monthGan, setMonthGan] = useState<Gan | undefined>();
  const [monthJi, setMonthJi] = useState<Ji | undefined>();
  const [dayGan, setDayGan] = useState<Gan | undefined>();
  const [dayJi, setDayJi] = useState<Ji | undefined>();
  const [hourGan, setHourGan] = useState<Gan | undefined>();
  const [hourJi, setHourJi] = useState<Ji | undefined>();
  const [gender, setGender] = useState<string>('남자');
  const [analysisResult, setAnalysisResult] = useState<string>('');

  const renderSeparatedGrid = (
    title: string,
    ganValue: Gan | undefined,
    jiValue: Ji | undefined,
    onGanSelect: (value: Gan) => void,
    onJiSelect: (value: Ji) => void,
    showUnknown: boolean = false
  ) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">천간</p>
          <div className="grid grid-cols-10 gap-2">
            {['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'].map(
              (gan) => (
                <button
                  key={gan}
                  onClick={() => onGanSelect(gan as Gan)}
                  className={`h-16 flex flex-col items-center justify-center border rounded-lg relative
                  ${
                    ganValue === gan
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{gan}</span>
                  <span className="text-sm text-gray-500">{getHanja(gan)}</span>
                  {ganValue === gan && (
                    <Check className="w-4 h-4 absolute top-1 right-1 text-blue-500" />
                  )}
                </button>
              )
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">지지</p>
          <div className="grid grid-cols-12 gap-2">
            {[
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
            ].map((ji) => (
              <button
                key={ji}
                onClick={() => onJiSelect(ji as Ji)}
                className={`h-16 flex flex-col items-center justify-center border rounded-lg relative
                  ${
                    jiValue === ji
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <span className="text-lg">{ji}</span>
                <span className="text-sm text-gray-500">
                  {getHanja(ji === '신' ? '신지' : ji)}
                </span>
                {jiValue === ji && (
                  <Check className="w-4 h-4 absolute top-1 right-1 text-blue-500" />
                )}
              </button>
            ))}
            {showUnknown && (
              <button
                onClick={() => onJiSelect('신' as Ji)}
                className={`h-16 flex flex-col items-center justify-center border rounded-lg relative
                  ${
                    jiValue === '신'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <span className="text-lg">모름</span>
                <span className="text-sm text-gray-500">
                  {getHanja('모름')}
                </span>
                {jiValue === '신' && (
                  <Check className="w-4 h-4 absolute top-1 right-1 text-blue-500" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const handleAnalysis = () => {
    if (yearGan && yearJi && monthGan && monthJi && dayGan && dayJi) {
      const result = analyzeSaju(
        `${yearGan}${yearJi}`,
        `${monthGan}${monthJi}`,
        `${dayGan}${dayJi}`,
        gender
      );

      const matchedGanji = result.match(
        /[갑을병정무기경신임계][자축인묘진사오미신유술해]/
      )?.[0];
      let seasonalLine = '';
      if (matchedGanji) {
        const now = new Date().getFullYear();
        const [term1, term2] = getSeasonalTermsByGanji(matchedGanji, now);
        seasonalLine = `현재 당신의 60년 기준 운명 절기는 ${term1} 또는 ${term2}입니다.`;
      }

      // result에서 "입니다." 앞에 "년" 추가
      const modifiedResult = result.replace(/입니다\.$/, '년 입니다.');
      const finalResult = `${modifiedResult}\n${seasonalLine}`;
      setAnalysisResult(finalResult);
      if (onAnalysisComplete) {
        onAnalysisComplete(finalResult);
      }
    } else {
      setAnalysisResult('모든 필수 항목을 선택해주세요.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-8">
        {renderSeparatedGrid('년주', yearGan, yearJi, setYearGan, setYearJi)}
        {renderSeparatedGrid(
          '월주',
          monthGan,
          monthJi,
          setMonthGan,
          setMonthJi
        )}
        {renderSeparatedGrid('일주', dayGan, dayJi, setDayGan, setDayJi)}
        {renderSeparatedGrid(
          '시주',
          hourGan,
          hourJi,
          setHourGan,
          setHourJi,
          true
        )}

        <div className="flex items-center space-x-4 mb-6">
          <span className="text-sm font-medium">성별:</span>
          <div className="space-x-4">
            {['남자', '여자'].map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-4 py-2 rounded-lg ${
                  gender === g
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleAnalysis}
        className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        사주 분석하기
      </button>

      {analysisResult && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <p className="text-green-800 whitespace-pre-line">{analysisResult}</p>
        </div>
      )}
    </div>
  );
}

function getHanja(char: string): string {
  const hanjaMap: { [key: string]: string } = {
    갑: '甲',
    을: '乙',
    병: '丙',
    정: '丁',
    무: '戊',
    기: '己',
    경: '庚',
    신: '辛',
    임: '壬',
    계: '癸',
    자: '子',
    축: '丑',
    인: '寅',
    묘: '卯',
    진: '辰',
    사: '巳',
    오: '午',
    미: '未',
    신지: '申',
    유: '酉',
    술: '戌',
    해: '亥',
    모름: '未知',
  };
  return hanjaMap[char] || char;
}
