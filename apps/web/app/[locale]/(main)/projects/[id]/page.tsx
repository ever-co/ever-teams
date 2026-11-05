'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ProjectDetailPageComponent } from '@/core/components/pages/projects/project-detail';
import { ProjectDetailPageSkeleton } from '@/core/components/pages/projects/project-detail/project-detail-skeleton';

function Page() {
	return <ProjectDetailPageComponent />;
}

export default withAuthentication(Page, { displayName: 'ProjectDetailPage', skeleton: ProjectDetailPageSkeleton });
