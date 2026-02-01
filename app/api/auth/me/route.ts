import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: session });
}
