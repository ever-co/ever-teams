/**
 * Regression: the Gauzy API returns `startDate: null` and `endDate: null` for projects saved without
 * dates. The schema coerced that null into 1970-01-01, so the projects list, grid, export and View info
 * showed 1970 for such projects, and the edit wizard opened on 1970 instead of its default dates.
 */
import { organizationProjectSchema } from './organization-project.schema';

const minimalProject = {
	id: '5f0b6f7e-2c1d-4a8e-9b3f-7d6c5e4a3b21',
	name: 'Website',
	public: true,
	owner: null,
	code: null,
	tenantId: 'ec3b6673-d045-4d59-a307-a79521500a81',
	organizationId: '06dea660-2426-4c79-a5aa-05f3434287d9'
};

const startIso = '2026-10-01T00:00:00.000Z';
const endIso = '2026-12-31T00:00:00.000Z';

describe('organizationProjectSchema (project dates)', () => {
	it('keeps a null start and end date null instead of 1970-01-01', () => {
		const response = { ...minimalProject, startDate: null, endDate: null };

		const project = organizationProjectSchema.parse(response);

		expect(project.startDate).toBeNull();
		expect(project.endDate).toBeNull();
	});

	it('still turns ISO start and end dates into dates', () => {
		const response = { ...minimalProject, startDate: startIso, endDate: endIso };
		const expectedStart = new Date(startIso);
		const expectedEnd = new Date(endIso);

		const project = organizationProjectSchema.parse(response);

		expect(project.startDate).toEqual(expectedStart);
		expect(project.endDate).toEqual(expectedEnd);
	});

	it('leaves missing dates undefined', () => {
		const project = organizationProjectSchema.parse(minimalProject);

		expect(project.startDate).toBeUndefined();
		expect(project.endDate).toBeUndefined();
	});
});
