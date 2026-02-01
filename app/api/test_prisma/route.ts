import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        console.log('Testing Prisma User model...');
        // @ts-ignore
        if (!prisma.user) {
            console.error('prisma.user is undefined!');
            return NextResponse.json({ error: 'prisma.user is undefined' }, { status: 500 });
        }
        const count = await prisma.user.count();
        return NextResponse.json({ count });
    } catch (error: any) {
        console.error('Prisma Test Error:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
