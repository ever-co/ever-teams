import { z } from 'zod';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';
import { uuIdSchema } from '../common/base.schema';
import { EIssueType } from '../../generics/enums/task';

export const taskIssueTypeSchema = basePerTenantAndOrganizationEntitySchema.extend({
	name: z.nativeEnum(EIssueType),
	value: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	isSystem: z.boolean().optional(),
	imageId: z.string().nullable().optional(),
	projectId: z.string().nullable().optional(),
	organizationTeamId: uuIdSchema.optional(),
	image: z.string().nullable().optional(),
	fullIconUrl: z.string().optional(),
	template: z.string().optional()
});

export type TTaskIssueType = z.infer<typeof taskIssueTypeSchema>;
