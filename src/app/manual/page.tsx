import Link from "next/link";
import { SajuSelector } from "@/components/SajuSelector";

export default function ManualPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-white px-3 py-6 text-gray-900 sm:px-6">
      <nav aria-label="분석 방법" className="mb-4 flex flex-wrap items-center gap-4">
        <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">생년월일로 계산</Link>
        <span aria-current="page" className="font-medium">간지 직접 선택</span>
      </nav>
      <h1 className="text-2xl font-medium">간지 직접 선택</h1>
      <SajuSelector />
    </main>
  );
}
