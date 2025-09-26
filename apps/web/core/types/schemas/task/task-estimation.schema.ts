import z from 'zod';
import { uuIdSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';

export const taskEstimationsSchema = z
	.object({
		estimate: z.number().min(0),
		employeeId: uuIdSchema,
		taskId: uuIdSchema
	})
	.merge(basePerTenantAndOrganizationEntitySchema);

export const createTaskEstimationSchema = taskEstimationsSchema.omit({ id: true });

export type TTaskEstimation = z.infer<typeof taskEstimationsSchema>;
export type TCreateTaskEstimation = z.infer<typeof createTaskEstimationSchema>;
