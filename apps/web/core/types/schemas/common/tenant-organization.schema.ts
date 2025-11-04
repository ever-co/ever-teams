import { z } from 'zod';
import { basePerTenantEntityModelSchema } from './base.schema';
import { organizationSchema } from '../organization/organization.schema';

export const basePerTenantAndOrganizationEntitySchema = z
	.object({
		organizationId: z.string().nullable().optional(),
		organization: organizationSchema.optional().nullable()
	})
	.merge(basePerTenantEntityModelSchema);
