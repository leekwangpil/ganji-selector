import { Check } from 'lucide-react';
import { full_gan, full_ji, Gan, Ji } from '@/utils/saju';

interface GanjiSelectorProps {
  onGanSelect: (value: Gan) => void;
  onJiSelect: (value: Ji) => void;
  selectedGan?: Gan;
  selectedJi?: Ji;
}

export function GanjiSelector({
  onGanSelect,
  onJiSelect,
  selectedGan,
  selectedJi,
}: GanjiSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">천간</p>
        <div className="grid grid-cols-10 gap-2">
          {full_gan.map((gan: Gan) => (
            <button
              key={gan}
              onClick={() => onGanSelect(gan)}
              className={`h-16 flex flex-col items-center justify-center border rounded-lg relative
                ${
                  gan === selectedGan
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
            >
              <span className="text-lg">{gan}</span>
              {gan === selectedGan && (
                <Check className="w-4 h-4 absolute top-1 right-1 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-1">지지</p>
        <div className="grid grid-cols-12 gap-2">
          {full_ji.map((ji: Ji) => (
            <button
              key={ji}
              onClick={() => onJiSelect(ji)}
              className={`h-16 flex flex-col items-center justify-center border rounded-lg relative
                ${
                  ji === selectedJi
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
            >
              <span className="text-lg">{ji}</span>
              {ji === selectedJi && (
                <Check className="w-4 h-4 absolute top-1 right-1 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
