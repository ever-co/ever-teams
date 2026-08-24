import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const webRoot = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(resolve(webRoot, path), 'utf8');

describe('fast feature data wiring', () => {
	it('owns formerly global data at the feature that renders it', () => {
		expect(read('app/[locale]/(main)/reports/weekly-limit/page.tsx')).toContain(
			'useFastCurrentOrganizationOwner();'
		);
		expect(
			read('core/components/features/projects/add-or-edit-project/steps/financial-settings-form.tsx')
		).toContain('useFastCurrenciesOwner()');
		expect(read('core/components/features/teams/invite-form-modal.tsx')).toContain('useFastInviteDataOwner(open)');
	});

	it('owns team plan badges once at each outer task surface, never per card', () => {
		for (const path of [
			'app/[locale]/(main)/kanban/page.tsx',
			'app/[locale]/(main)/profile/[memberId]/page.tsx',
			'app/[locale]/(main)/task/[id]/page.tsx',
			'core/components/pages/teams/team/team-members.tsx'
		]) {
			expect(read(path)).toContain('useFastTeamDailyPlansOwner(');
		}

		expect(read('core/components/tasks/task-all-status-type.tsx')).not.toContain('useTeamDailyPlans');
		expect(read('core/components/tasks/task-all-status-type.tsx')).not.toContain('useFastTeamDailyPlansOwner');
	});

	it('keeps abort signals connected from scoped queries to every affected API read', () => {
		for (const path of [
			'core/hooks/auth/use-current-organization.ts',
			'core/hooks/common/use-currencies.ts',
			'core/hooks/common/use-language-settings.ts',
			'core/hooks/daily-plans/use-team-daily-plans.ts',
			'core/hooks/invitations/use-my-invitations-query.ts',
			'core/hooks/invitations/use-team-invitations-query.ts',
			'core/hooks/organizations/employees/use-employee.ts',
			'core/hooks/organizations/projects/use-organization-projects-query.ts',
			'core/hooks/organizations/projects/use-organization-projects-pagination.ts',
			'core/hooks/roles/use-roles-query.ts'
		]) {
			const source = read(path);
			expect(source).toContain('signal');
			expect(source).toContain('scope');
		}
	});

	it('pins every fast request to the same explicit scope represented by its cache key', () => {
		for (const path of [
			'core/hooks/auth/use-current-organization.ts',
			'core/hooks/common/use-currencies.ts',
			'core/hooks/common/use-language-settings.ts',
			'core/hooks/daily-plans/use-team-daily-plans.ts',
			'core/hooks/invitations/use-my-invitations-query.ts',
			'core/hooks/invitations/use-team-invitations-query.ts',
			'core/hooks/organizations/employees/use-employee.ts',
			'core/hooks/organizations/projects/use-organization-projects-query.ts',
			'core/hooks/organizations/projects/use-organization-projects-pagination.ts',
			'core/hooks/roles/use-roles-query.ts'
		]) {
			expect(read(path)).toContain('const scope =');
		}

		expect(read('core/hooks/daily-plans/use-team-daily-plans.ts')).toContain('byTaskByScope');
		expect(read('core/hooks/daily-plans/use-team-daily-plans.ts')).toContain('taskId');
		expect(read('core/hooks/daily-plans/use-team-daily-plans.ts')).toContain(
			'cancelQueries({ queryKey: taskQueryKey, exact: true })'
		);
	});

	it('defers private fast-sidebar data while keeping public-team transport disabled', () => {
		const sidebar = read('core/components/layouts/app-sidebar.tsx');
		expect(sidebar).toContain('useFastSidebarDataOwner(publicTeam)');
		expect(read('core/hooks/bootstrap/use-fast-feature-data.ts')).toContain('requestIdleCallback');
	});
});
