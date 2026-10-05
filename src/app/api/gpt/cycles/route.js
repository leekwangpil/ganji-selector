import { analyzeCycles } from '@/lib/manse/gpt-analysis';
export const runtime = 'nodejs';
export async function POST(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({error:'application/json 형식이 필요합니다.'},{status:415});
  const raw = await request.text();
  if (raw.length > 16384) return Response.json({error:'입력이 너무 큽니다.'},{status:413});
  try {
    return Response.json(analyzeCycles(JSON.parse(raw)),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return Response.json({error:error instanceof Error ? error.message : '계산 실패'},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
