import { z } from 'zod';

export const PartnerStatusEnum = z.enum(['DRAFT', 'ONBOARDING', 'LIVE', 'MAINTENANCE', 'SUSPENDED']);
export const KanbanStageEnum = z.enum(['AWAITING_KICKOFF', 'SANDBOX_ACTIVE', 'SIT_VERIFICATION', 'REVISION_PENDING', 'READY_FOR_DEPLOY']);
export const DocStatusEnum = z.enum(['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED']);

export const PartnerDocStatusSchema = z.object({
    sit: DocStatusEnum,
    reconcile: DocStatusEnum,
    devsite: DocStatusEnum,
});

export const CreatePartnerSchema = z.object({
    name: z.string().min(1, 'Partner name is required'),
    code: z.string().min(1, 'Partner code is required'),
    status: PartnerStatusEnum,
    kanbanStage: KanbanStageEnum.optional(),
    docStatus: PartnerDocStatusSchema.optional(),

    integrator: z.string().optional(),
    notes: z.string().optional(),
});

export const UpdatePartnerSchema = CreatePartnerSchema.partial().extend({
    id: z.string(),
});

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof UpdatePartnerSchema>;
export type PartnerStatus = z.infer<typeof PartnerStatusEnum>;
export type KanbanStage = z.infer<typeof KanbanStageEnum>;
export type DocStatus = z.infer<typeof DocStatusEnum>;
export type PartnerDocStatus = z.infer<typeof PartnerDocStatusSchema>;
