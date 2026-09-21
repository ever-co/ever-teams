export type DeterministicApiOrigins = {
	GAUZY_API_SERVER_URL?: string;
	NEXT_PUBLIC_GAUZY_API_SERVER_URL?: string;
};

export function assertDeterministicApiOrigins(mockOrigin: string, configured: DeterministicApiOrigins): void;
export function resolvePerformanceOutput(projectRoot: string, requestedOutput?: string): string;
