import { prisma } from '@/app/lib/prisma';
import { featureSchema } from '@/app/lib/validations/feature';
import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth';
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

        const existingFeature = await prisma.feature.findUnique({ where: { id } });

        const feature = await prisma.feature.update({
            where: { id },
            data: body,
        });

        const session = await getSession();
        if (session && session.id && existingFeature) {
             const changedFields: string[] = [];
             for (const key of Object.keys(body)) {
                 if (JSON.stringify((body as any)[key]) !== JSON.stringify((existingFeature as any)[key])) {
                     changedFields.push(key);
                 }
             }

             if (changedFields.length > 0) {
                 await prisma.activityLog.create({
                     data: {
                         userId: session.id as string,
                         actionType: 'UPDATE_FEATURE',
                         entityType: 'feature',
                         entityId: feature.id,
                         metadata: { updatedFields: changedFields }
                     }
                 });
             }
        }

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
        const existingFeature = await prisma.feature.findUnique({ where: { id } });
        if (existingFeature) {
             await prisma.feature.delete({
                 where: { id },
             });

             const session = await getSession();
             if (session && session.id) {
                 await prisma.activityLog.create({
                      data: {
                          userId: session.id as string,
                          actionType: 'DELETE_FEATURE',
                          entityType: 'feature',
                          entityId: id,
                          metadata: { name: existingFeature.name }
                      }
                  });
             }
        }

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
