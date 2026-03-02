'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ProjectDetailPageComponent } from '@/core/components/pages/projects/project-detail';

function Page() {
	return <ProjectDetailPageComponent />;
}

export default withAuthentication(Page, { displayName: 'ProjectDetailPage' });
