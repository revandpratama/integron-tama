import { prisma } from '@/app/lib/prisma';
import { featureSchema } from '@/app/lib/validations/feature';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // In Next.js 15+ params are async
) {
    try {
        const { id } = await params;
        const feature = await prisma.feature.findUnique({
            where: { id },
        });

        if (!feature) {
            return NextResponse.json(
                { error: 'Feature not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(feature);
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const json = await request.json();
        const body = featureSchema.parse(json);

        const feature = await prisma.feature.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(feature);
    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.feature.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
