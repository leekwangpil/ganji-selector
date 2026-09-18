import Link from 'next/link';
import { ManseCalculator } from '@/components/manse/ManseCalculator';

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-3 py-6 sm:px-6">
      <nav aria-label="분석 방법" className="mb-4 flex flex-wrap items-center gap-4">
        <span aria-current="page" className="font-medium">생년월일로 계산</span>
        <Link href="/manual" className="inline-flex min-h-11 items-center underline underline-offset-4">간지 직접 선택</Link>
      </nav>
      <ManseCalculator />
    </main>
  );
}
