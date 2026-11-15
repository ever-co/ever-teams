'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ProjectDetailPageComponent } from '@/core/components/pages/projects/project-detail';
import { ProjectDetailPageSkeleton } from '@/core/components/pages/projects/project-detail/project-detail-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The workspace's week start, clock and formats come with the organisation, loaded here on a direct visit. */
function Page() {
	useCurrentOrganizationOwner();
	return <ProjectDetailPageComponent />;
}

export default withAuthentication(Page, { displayName: 'ProjectDetailPage', skeleton: ProjectDetailPageSkeleton });
