import { z } from 'zod';

export const PartnerStatusEnum = z.enum(['DRAFT', 'ONBOARDING', 'LIVE', 'MAINTENANCE', 'SUSPENDED']);
export const BoardStageEnum = z.enum(['INITIATION', 'KICKOFF_SETUP', 'DEV_CONFIG', 'TESTING_VALIDATION', 'QA_REVIEW', 'PARTNER_REVISION', 'BLOCKED_WAITING', 'PRE_PRODUCTION', 'PRODUCTION_READY', 'DEPLOYED', 'POST_DEPLOYMENT', 'DONE', 'ARCHIVED']);
export const IntegrationTypeEnum = z.enum(['INBOUND', 'OUTBOUND', 'HYBRID']);
export const ComplexityEnum = z.enum(['LOW', 'MEDIUM', 'HARD']);
export const TrafficLightEnum = z.enum(['HEALTHY', 'DEGRADED', 'CRITICAL']);
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
    boardStage: BoardStageEnum.optional(),
    docStatus: PartnerDocStatusSchema.optional(),

    integrationType: IntegrationTypeEnum.optional(),
    complexity: ComplexityEnum.optional(),
    trafficLight: TrafficLightEnum.optional(),
    boardTasks: z.any().optional(),
    trafficComments: z.any().optional(),

    integratorId: z.string().optional(),
    notes: z.string().optional(),
    featureIds: z.array(z.string()).optional(),
    kanbanOrder: z.number().int().optional(),
});

export const UpdatePartnerSchema = CreatePartnerSchema.partial().extend({
    id: z.string(),
});

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof UpdatePartnerSchema>;
export type PartnerStatus = z.infer<typeof PartnerStatusEnum>;
export type BoardStage = z.infer<typeof BoardStageEnum>;
export type IntegrationType = z.infer<typeof IntegrationTypeEnum>;
export type Complexity = z.infer<typeof ComplexityEnum>;
export type TrafficLight = z.infer<typeof TrafficLightEnum>;
export type DocStatus = z.infer<typeof DocStatusEnum>;
export type PartnerDocStatus = z.infer<typeof PartnerDocStatusSchema>;
