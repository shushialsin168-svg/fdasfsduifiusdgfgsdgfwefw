import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, downloads } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { BakongKHQR, khqrData, IndividualInfo } from 'bakong-khqr';
import { ensureTables } from '@/db/ensure';

// Configure via env vars, falls back to demo values
const BAKONG_ACCOUNT = process.env.BAKONG_ACCOUNT_ID || 'demo@aba'; // e.g. yourname@wing / yourname@aba
const MERCHANT_NAME = process.env.BAKONG_MERCHANT_NAME || 'Premium Downloads KH';
const MERCHANT_CITY = process.env.BAKONG_MERCHANT_CITY || 'Phnom Penh';
const QR_EXPIRE_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    await ensureTables();
    const { downloadId } = await request.json();

    if (!downloadId) {
      return NextResponse.json({ error: 'Download ID is required' }, { status: 400 });
    }

    // Get download details
    const downloadResult = await db.select().from(downloads).where(eq(downloads.id, downloadId)).limit(1);

    if (downloadResult.length === 0) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }

    const download = downloadResult[0];
    const amount = parseFloat(download.price);

    // Generate unique bill number
    const billNumber = `DL-${Date.now().toString(36).toUpperCase()}`;

    // Create IndividualInfo for a dynamic KHQR.
    // NOTE: expirationTimestamp is REQUIRED for dynamic KHQR (QR with an amount).
    const optionalData = {
      currency: khqrData.currency.usd,
      amount: amount,
      billNumber: billNumber,
      storeLabel: download.title.substring(0, 25),
      terminalLabel: 'WEB',
      expirationTimestamp: Date.now() + QR_EXPIRE_MINUTES * 60 * 1000,
    };

    const individualInfo = new IndividualInfo(
      BAKONG_ACCOUNT,
      MERCHANT_NAME,
      MERCHANT_CITY,
      optionalData
    );

    const khqr = new BakongKHQR();
    const qrResponse = khqr.generateIndividual(individualInfo);

    // Response shape: { status: { code, errorCode, message }, data: { qr, md5 } }
    if (!qrResponse || qrResponse.status?.code !== 0 || !qrResponse.data?.qr) {
      console.error('KHQR generation failed:', JSON.stringify(qrResponse?.status));
      return NextResponse.json({
        error: qrResponse?.status?.message || 'Failed to generate KHQR code',
        details: qrResponse?.status,
      }, { status: 500 });
    }

    const qrString: string = qrResponse.data.qr;
    const md5: string = qrResponse.data.md5;

    // Store payment record
    let payment;
    try {
      [payment] = await db.insert(payments).values({
        md5,
        amount: amount.toFixed(2),
        currency: 'USD',
        status: 'pending',
      }).onConflictDoNothing({ target: payments.md5 }).returning();
    } catch {
      // Fallback for databases where the unique index on md5 couldn't be
      // created (e.g. legacy tables) — insert without conflict handling.
      const existing = await db.select().from(payments).where(eq(payments.md5, md5)).limit(1);
      if (existing.length > 0) {
        payment = existing[0];
      } else {
        [payment] = await db.insert(payments).values({
          md5,
          amount: amount.toFixed(2),
          currency: 'USD',
          status: 'pending',
        }).returning();
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment?.id ?? null,
      md5,
      qrString,
      amount: amount.toFixed(2),
      downloadTitle: download.title,
      billNumber,
      expiresAt: optionalData.expirationTimestamp,
      demoMode: !process.env.BAKONG_TOKEN,
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
