/**
 * Regression (#4809): Gauzy stores a task status name as free text, but the schema only accepted the
 * standard names. Creating a status named "QA" showed a Mutation Error although Gauzy saved it, and the
 * task metadata read then failed for the whole team, so the status, priority, size, label and version
 * lists came back empty.
 */
// Imported through the barrel, as the app does: the zod schema modules import each other in a cycle and
// the barrel sets a working evaluation order.
import { taskStatusSchema, validatePaginationResponse } from '@/core/types/schemas';

const standardStatus = {
	id: '3f2b6c1e-7d4a-4b8e-9c5f-2a1d0e6b7c84',
	name: 'open',
	value: 'open',
	template: null,
	tenantId: 'ec3b6673-d045-4d59-a307-a79521500a81',
	organizationId: '06dea660-2426-4c79-a5aa-05f3434287d9',
	organizationTeamId: '8a6e2d4c-1b3f-4e5a-8c7d-9f0e1a2b3c4d'
};

// Gauzy derives the value from the name, so a status named "QA" comes back with the value "qa".
const customStatus = {
	...standardStatus,
	id: 'b7c1d2e3-4f5a-4b6c-8d7e-0f1a2b3c4d5e',
	name: 'QA',
	value: 'qa'
};

describe('taskStatusSchema (API response shapes)', () => {
	it('accepts a custom name such as "QA" (Gauzy stores the name as free text)', () => {
		const result = taskStatusSchema.safeParse(customStatus);
		expect(result.success).toBe(true);
	});

	it('still accepts a standard name', () => {
		const result = taskStatusSchema.safeParse(standardStatus);
		expect(result.success).toBe(true);
	});

	it('keeps the bootstrap statuses section loading when a custom status sits next to a standard one', () => {
		const section = { items: [standardStatus, customStatus], total: 2 };
		const validated = validatePaginationResponse(taskStatusSchema, section, 'task metadata bootstrap statuses');
		const names = validated.items.map((status) => status.name);
		expect(names).toEqual(['open', 'QA']);
	});

	it('control: still rejects a non-string name', () => {
		const numericName = { ...customStatus, name: 42 };
		const result = taskStatusSchema.safeParse(numericName);
		expect(result.success).toBe(false);
	});

	it('control: still rejects a template outside the standard names', () => {
		const customTemplate = { ...customStatus, template: 'QA' };
		const result = taskStatusSchema.safeParse(customTemplate);
		expect(result.success).toBe(false);
	});

	it('control: still rejects an unknown field (the schema stays strict)', () => {
		const unknownField = { ...customStatus, unexpectedField: true };
		const result = taskStatusSchema.safeParse(unknownField);
		expect(result.success).toBe(false);
	});
});
