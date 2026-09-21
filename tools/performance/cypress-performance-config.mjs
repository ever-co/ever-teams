import { resolve } from 'node:path';

const DEFAULT_PERFORMANCE_OUTPUT = 'artifacts/startup-candidate.json';

function configuredOrigin(name, value) {
	if (!value?.trim()) throw new Error(`Deterministic Cypress requires ${name}.`);
	try {
		return new URL(value).origin;
	} catch {
		throw new Error(`Deterministic Cypress requires ${name} to be an absolute URL.`);
	}
}

export function assertDeterministicApiOrigins(mockOrigin, configured) {
	const expectedOrigin = new URL(mockOrigin).origin;
	for (const name of ['GAUZY_API_SERVER_URL', 'NEXT_PUBLIC_GAUZY_API_SERVER_URL']) {
		const actualOrigin = configuredOrigin(name, configured[name]);
		if (actualOrigin !== expectedOrigin) {
			throw new Error(`Deterministic Cypress requires ${name} to target the mock Gauzy API origin.`);
		}
	}
}

export function resolvePerformanceOutput(projectRoot, requestedOutput = DEFAULT_PERFORMANCE_OUTPUT) {
	return resolve(projectRoot, requestedOutput);
}
