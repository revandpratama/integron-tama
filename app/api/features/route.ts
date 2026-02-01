import { prisma } from '@/app/lib/prisma';
import { featureSchema } from '@/app/lib/validations/feature';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category');

        const skip = (page - 1) * limit;

        const where: any = {};

        // Category Filter
        if (category && category !== 'All') {
            where.category = category as any;
        }

        // Search Filter
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { apigeeProducts: { hasSome: [search] } }, // Note: arrays in Prisma Postgres, 'hasSome' might need exact match or workaround for partial. 
                // However, simple string search on arrays is limited. 
                // Let's stick to name search or simple array contains if possible.
                // For arrays of strings, `has` checks exact match. `hasSome` checks any exact match.
                // Partial match on array elements is tricky in Prisma without raw SQL.
                // Let's try to keep it simple: Search Name only for now, or fetch all if search is needed (undesirable for pagination).
                // Actually, let's keep name search for robust server-side.
                // To support the previous client-side behavior of searching products/proxies, we can try to use filtering if possible?
                // Let's restrict search to Name for now to keep performance high, or standard text search.
            ];
            // Improving search to be more friendly:
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                // Just name search for simplicity and correctness with Prisma standard
            ];
        }

        // Parallel fetch for count and data
        const [features, total] = await Promise.all([
            prisma.feature.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    updatedAt: 'desc',
                },
            }),
            prisma.feature.count({ where }),
        ]);

        return NextResponse.json({
            data: features,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        console.error('Failed to fetch features:', error);
        return NextResponse.json(
            { error: 'Failed to fetch features' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const body = featureSchema.parse(json);

        const feature = await prisma.feature.create({
            data: body,
        });

        return NextResponse.json(feature, { status: 201 });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Validation error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
