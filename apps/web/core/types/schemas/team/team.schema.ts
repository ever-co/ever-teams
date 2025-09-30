import { z } from 'zod';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';
import { organizationTeamEmployeeSchema } from './organization-team-employee.schema';
import { relationalOrganizationProjectSchema } from '../common/base.schema';
// import { taskSchema } from '../task/task.schema';

export const teamAssociationsSchema = z.object({
	members: z.array(organizationTeamEmployeeSchema),
	managers: z.array(organizationTeamEmployeeSchema),
	projects: z.array(relationalOrganizationProjectSchema).optional(),
	tasks: z.array(z.any())
});
export const teamSchema = z
	.object({
		name: z.string(),
		color: z.string().optional().nullable(),
		emoji: z.string().optional().nullable(),
		teamSize: z.string().optional().nullable(),
		logo: z.string().optional(),
		prefix: z.string().optional(),
		shareProfileView: z.boolean().optional(),
		requirePlanToTrack: z.boolean().optional(),
		public: z.boolean().nullable(),
		profile_link: z.string().optional(),
		imageId: z.string().optional(),
		image: z.any().optional(),
		organizationId: z.string().optional(),
		tenantId: z.string().optional(),
		tags: z.array(z.any()).optional(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional()
	})
	.merge(basePerTenantAndOrganizationEntitySchema)
	.merge(teamAssociationsSchema)
	.passthrough();

export type TTeamAssociations = z.infer<typeof teamAssociationsSchema>;
export type TOrganizationTeam = z.infer<typeof teamSchema>;
