import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

import { CreatePartnerSchema } from '@/app/lib/validations/partner';

import { canMoveToReady } from '@/app/kanban/utils';
import { PartnerDocStatus } from '@/app/lib/validations/partner';
import { getSession } from '@/app/lib/auth';

const FEATURE_SELECT = { select: { id: true, name: true, category: true } };

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Use Partial of CreateSchema to allow updating single fields (like status or notes)
        const UpdateSchema = CreatePartnerSchema.partial();
        const result = UpdateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: result.error.issues },
                { status: 400 }
            );
        }

        const { featureIds, ...restData } = result.data;
        const data: any = restData;

        // Fetch existing partner for transition logic
        const existingPartner = await prisma.partner.findUnique({ where: { id } });
        if (!existingPartner) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        // Logic 1: DRAFT -> ONBOARDING trigger
        if (existingPartner.status === 'DRAFT' && data.status === 'ONBOARDING') {
            if (!data.kanbanStage) {
                // Automatically set to first stage if not provided
                data.kanbanStage = 'AWAITING_KICKOFF';
            }
        }

        const partner = await prisma.partner.update({
            where: { id },
            data: {
                ...data,
                // If featureIds is explicitly passed (even empty array), replace the set
                ...(featureIds !== undefined && {
                    features: { set: featureIds.map(fid => ({ id: fid })) }
                }),
            },
            include: {
                integrator: { select: { id: true, name: true, email: true } },
                features: FEATURE_SELECT,
            }
        });

        const session = await getSession();
        if (session && session.id) {
            const changedFields: string[] = [];
            for (const key of Object.keys(restData)) {
                if (JSON.stringify((restData as any)[key]) !== JSON.stringify((existingPartner as any)[key])) {
                    changedFields.push(key);
                }
            }
            if (featureIds !== undefined) changedFields.push('features');

            if (changedFields.length > 0) {
                await prisma.activityLog.create({
                     data: {
                         userId: session.id as string,
                         actionType: 'UPDATE_PARTNER',
                         entityType: 'partner',
                         entityId: partner.id,
                         metadata: { updatedFields: changedFields, details: restData }
                     }
                 });
            }
        }

        return NextResponse.json(partner);
    } catch (error) {
        console.error('Error updating partner:', error);
        return NextResponse.json(
            { error: 'Failed to update partner' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Check if partner exists
        const existingPartner = await prisma.partner.findUnique({ where: { id } });
        if (!existingPartner) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        await prisma.partner.delete({
            where: { id },
        });

        const session = await getSession();
        if (session && session.id) {
            await prisma.activityLog.create({
                 data: {
                     userId: session.id as string,
                     actionType: 'DELETE_PARTNER',
                     entityType: 'partner',
                     entityId: id,
                     metadata: { name: existingPartner.name }
                 }
             });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting partner:', error);
        return NextResponse.json(
            { error: 'Failed to delete partner' },
            { status: 500 }
        );
    }
}
