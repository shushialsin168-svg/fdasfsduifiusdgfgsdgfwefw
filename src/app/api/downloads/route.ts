import { NextResponse } from 'next/server';
import { db } from '@/db';
import { downloads } from '@/db/schema';
import { ensureTables } from '@/db/ensure';

const PRODUCTS = [
  {
    title: "BMW CAR FILE",
    description: "Premium BMW car file. Instant access to the download link right after your KHQR payment.",
    price: "9.99",
    fileUrl: "https://drive.google.com/file/d/1JqN444ovUpaEJLsFp0pLkUVAfPASa1Xp/view?usp=sharing",
    imageUrl: "/products/bmw.png",
    category: "Car Files",
  },
  {
    title: "RAPTER CAR FILE",
    description: "Premium Rapter car file. Instant access to the download link right after your KHQR payment.",
    price: "9.99",
    fileUrl: "https://drive.google.com/file/d/1awKvQCSB5cVqxj5rWH3vUqpxjXmxV_qX/view?usp=sharing",
    imageUrl: "/products/rapter.png",
    category: "Car Files",
  },
];

export async function GET() {
  try {
    await ensureTables();
    const allDownloads = await db.select().from(downloads);

    if (allDownloads.length === 0) {
      await db.insert(downloads).values(PRODUCTS);
      return NextResponse.json(await db.select().from(downloads));
    }

    return NextResponse.json(allDownloads);
  } catch (error) {
    console.error('Downloads API error:', error);
    return NextResponse.json(
      {
        error: 'database_unavailable',
        message: error instanceof Error ? error.message : 'Unknown database error',
        hint: 'Make sure PostgreSQL is running and DATABASE_URL in .env points to it (e.g. postgresql://postgres:postgres@127.0.0.1:5432/app_db).',
      },
      { status: 500 }
    );
  }
}
