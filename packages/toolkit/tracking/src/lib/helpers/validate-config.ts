import { ITeamsConfig } from '../types';

export const validateConfig = (config: ITeamsConfig) => {
	const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

	if (
		!isNonEmptyString(config.organizationId) ||
		!isNonEmptyString(config.tenantId) ||
		!isNonEmptyString(config.token)
	) {
		const missingFields: string[] = [];
		if (!isNonEmptyString(config.organizationId)) missingFields.push('organizationId');
		if (!isNonEmptyString(config.tenantId)) missingFields.push('tenantId');
		if (!isNonEmptyString(config.token)) missingFields.push('token');
		throw new Error(
			`The following fields must be non-empty strings to start tracking: ${missingFields.join(', ')}`
		);
	}
};
