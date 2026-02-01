import { z } from 'zod';

export const featureSchema = z.object({
    name: z.string().min(1, "Name is required"),
    category: z.enum(["SNAP", "NON_SNAP"]),
    apigeeProducts: z.array(z.string()).default([]),
    apigeeTraceProxies: z.array(z.string()).default([]),
    notes: z.string().optional(),
});

export type CreateFeatureInput = z.infer<typeof featureSchema>;

// For API response compatibility if needed
export type Feature = CreateFeatureInput & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
};
