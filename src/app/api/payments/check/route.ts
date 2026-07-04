import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureTables } from '@/db/ensure';

const BAKONG_API_BASE = process.env.BAKONG_API_BASE || 'https://api-bakong.nbc.gov.kh';

export async function POST(request: NextRequest) {
  try {
    await ensureTables();
    const { md5, simulate } = await request.json();

    if (!md5) {
      return NextResponse.json({ error: 'MD5 is required' }, { status: 400 });
    }

    const token = process.env.BAKONG_TOKEN;

    // Demo mode: no Bakong API token configured.
    // Allow explicit simulation so the unlock flow can be tested end-to-end.
    if (!token) {
      if (simulate) {
        const [payment] = await db
          .update(payments)
          .set({ status: 'paid', paidAt: new Date(), downloadUnlocked: true })
          .where(eq(payments.md5, md5))
          .returning();

        return NextResponse.json({
          success: true,
          status: 'paid',
          isPaid: true,
          demoMode: true,
          payment,
        });
      }

      return NextResponse.json({
        success: true,
        status: 'pending',
        isPaid: false,
        demoMode: true,
        hint: 'Set BAKONG_TOKEN env var (register at https://api-bakong.nbc.gov.kh) to enable real payment verification.',
      });
    }

    // Real verification via Bakong Open API
    const res = await fetch(`${BAKONG_API_BASE}/v1/check_transaction_by_md5`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ md5 }),
      cache: 'no-store',
    });

    const result = await res.json();

    // responseCode 0 = transaction found (PAID), 1 = not found yet (UNPAID)
    const isPaid = result?.responseCode === 0 && !!result?.data;

    let payment = null;
    if (isPaid) {
      const updated = await db
        .update(payments)
        .set({ status: 'paid', paidAt: new Date(), downloadUnlocked: true })
        .where(eq(payments.md5, md5))
        .returning();
      payment = updated[0] ?? null;
    }

    return NextResponse.json({
      success: true,
      status: isPaid ? 'paid' : 'pending',
      isPaid,
      payment,
      bakong: {
        responseCode: result?.responseCode,
        responseMessage: result?.responseMessage,
      },
    });

  } catch (error) {
    console.error('Payment check error:', error);
    return NextResponse.json({
      error: 'Failed to check payment status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
