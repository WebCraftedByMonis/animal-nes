import { NextResponse } from 'next/server';
import { computeRankingScores } from '@/lib/ranking';

// POST - recompute every product's rankingScore right now, using the
// current RankingSettings weights. The same math also runs nightly via
// compute-rankings.js on the VPS; this just lets admin see the effect of a
// weight change immediately instead of waiting for the cron.
export async function POST() {
  try {
    const result = await computeRankingScores();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error recalculating rankings:', error);
    return NextResponse.json({ error: 'Failed to recalculate rankings' }, { status: 500 });
  }
}
