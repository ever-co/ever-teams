/**
 * The switch of Settings → Automations: on only for the exact value `true`, read at run time first.
 */
const mockRuntime: { value: string | undefined } = { value: undefined };

jest.mock('@/env-config', () => ({ readRuntimeEnv: () => mockRuntime.value }));

import { isTaskAutomationsEnabled } from './task-automations-enabled';

describe('isTaskAutomationsEnabled', () => {
	const saved = process.env.NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED;

	afterEach(() => {
		mockRuntime.value = undefined;
		if (saved === undefined) delete process.env.NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED;
		else process.env.NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED = saved;
	});

	it.each([
		['unset (the default)', undefined, false],
		['empty', '', false],
		['false', 'false', false],
		['true', 'true', true],
		['TRUE', 'TRUE', false],
		['1', '1', false]
	])('runtime value %s → %s', (_name, value, enabled) => {
		delete process.env.NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED;
		mockRuntime.value = value;
		expect(isTaskAutomationsEnabled()).toBe(enabled);
	});

	it('falls back to the build-time value when the runtime has none', () => {
		mockRuntime.value = undefined;
		process.env.NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED = 'true';
		expect(isTaskAutomationsEnabled()).toBe(true);
	});
});
