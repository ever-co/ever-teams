import z from 'zod';

export const taskLinkedIssueSchema = z.object({
	organizationId: z.string(),
	taskToId: z.string(),
	taskFromId: z.string(),
	action: z.number(),
	taskFrom: z.any().optional(),
	taskTo: z.any().optional(),
	id: z.string()
});

export type TTaskLinkedIssue = z.infer<typeof taskLinkedIssueSchema>;
