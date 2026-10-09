// The parts of the Ever Platform API mock (`@ever-co/connect-tools`, a dev dependency) the browser
// runs use: the package ships no type declarations for its ES modules.
declare module '@ever-co/connect-tools/mock-platform' {
	export interface MockPlatformStatsReport {
		instance_id: string;
		report_id: string;
		period: string;
		day: string;
		product: string;
		accepted_at: number;
	}

	export interface MockPlatform {
		state: { statsReports: MockPlatformStatsReport[]; reset(): void };
		recorder: { entries: unknown[]; clear(): void };
		listen(port?: number, host?: string): Promise<{ port: number; url: string }>;
		close(): Promise<void>;
	}

	export function createMockPlatform(options?: {
		config?: Record<string, unknown>;
		record?: string | null;
		log?: (message: string) => void;
	}): MockPlatform;
}
