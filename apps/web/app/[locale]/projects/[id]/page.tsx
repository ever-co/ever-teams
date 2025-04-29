'use client';

import { MainLayout } from '@/core/components/layouts/default-layout';
import { useOrganizationTeams } from '@/app/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';

function Page() {
	const { isTrackingEnabled } = useOrganizationTeams();
	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-col items-start justify-between gap-3">
						<div className="flex items-center justify-center h-10 gap-8">
							<h3 className="text-3xl font-medium ">Project</h3>
						</div>
					</div>
				</div>
			}
		></MainLayout>
	);
}

export default withAuthentication(Page, { displayName: 'ProjectPage' });
