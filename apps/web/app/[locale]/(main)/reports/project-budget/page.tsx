'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ProjectBudgetPage } from '@/core/components/dashboards/project-budget/project-budget-page';
import { ProjectBudgetPageSkeleton } from '@/core/components/dashboards/project-budget/project-budget-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/**
 * The organisation is loaded through the client service by its owner hook: its currency is the last fallback of a
 * cost budget, and the server-only organisation request resolves to the production host in the browser bundle.
 */
function ProjectBudgetReport() {
	useCurrentOrganizationOwner();
	return <ProjectBudgetPage />;
}

export default withAuthentication(ProjectBudgetReport, {
	displayName: 'ProjectBudgetReport',
	skeleton: ProjectBudgetPageSkeleton
});
