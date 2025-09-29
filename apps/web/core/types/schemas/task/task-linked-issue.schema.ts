import z from 'zod';
import { taskZodSchemaType } from './task.schema';

export const taskLinkedIssueSchema = z.object({
	organizationId: z.string(),
	taskToId: z.string(),
	taskFromId: z.string(),
	action: z.number(),
	taskFrom: z.lazy(() => taskZodSchemaType),
	taskTo: z.lazy(() => taskZodSchemaType),
	id: z.string()
});

export type TTaskLinkedIssue = z.infer<typeof taskLinkedIssueSchema>;
