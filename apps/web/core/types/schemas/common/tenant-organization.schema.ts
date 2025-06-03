import { z } from 'zod';
import { basePerTenantEntityModelSchema, idSchema } from './base.schema';
import { organizationSchema } from '../organization/organization.schema';

export const basePerTenantAndOrganizationEntityModelSchema = z
	.object({
		organizationId: idSchema.optional(),
		organization: organizationSchema.optional()
	})
	.merge(basePerTenantEntityModelSchema);
