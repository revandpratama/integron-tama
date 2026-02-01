import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
    await clearSession();
    return NextResponse.json({ success: true });
}
