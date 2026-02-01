import { z } from 'zod';

export interface KnowledgeNote {
    id: string;
    title: string;
    content: string;
    tags: string[];
    isPinned: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export const CreateNoteSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    tags: z.array(z.string()).default([]),
    isPinned: z.boolean().default(false),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
