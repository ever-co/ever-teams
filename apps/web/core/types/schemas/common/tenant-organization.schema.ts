import { z } from 'zod';
import { basePerTenantEntityModelSchema } from './base.schema';
import { organizationSchema } from '../organization/organization.schema';

export const basePerTenantAndOrganizationEntityModelSchema = z
	.object({
		organizationId: z.string().optional().nullable(),
		organization: organizationSchema.optional().nullable()
	})
	.merge(basePerTenantEntityModelSchema);
