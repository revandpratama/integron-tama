import { z } from 'zod';

export const CreatePersonSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    role: z.string().min(1, 'Role is required'),
    notes: z.string().optional(),
    partnerIds: z.array(z.string()).optional(),
    featureIds: z.array(z.string()).optional(),
});

export const UpdatePersonSchema = CreatePersonSchema.partial().extend({
    id: z.string(),
});

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
