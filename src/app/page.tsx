import { SajuSelector } from '@/components/SajuSelector';
import { getYearsFromGanji } from '@/utils/saju';

export default function Home() {
  const shinmiYears = getYearsFromGanji('신미');
  console.log('신미년:', shinmiYears);

  return (
    <main className="min-h-screen bg-white">
      <SajuSelector />
    </main>
  );
}
