export type MockGauzyServer = {
	origin: string;
	requests(): Array<{ method: string; path: string; query: string; startMs: number; endMs: number; status: number }>;
	state(): Record<string, unknown>;
	reset(): void;
	setScenario(scenario: Record<string, unknown>): void;
	close(): Promise<void>;
};

export function createMockGauzyServer(options: {
	fixture: Record<string, unknown>;
	port?: number;
}): Promise<MockGauzyServer>;
