'use client';

import { MainLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { useAtomValue } from 'jotai';
import { isTrackingEnabledState } from '@/core/stores';

function Page() {
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-col gap-3 justify-between items-start">
						<div className="flex gap-8 justify-center items-center h-10">
							<h3 className="text-3xl font-medium">Project</h3>
						</div>
					</div>
				</div>
			}
		></MainLayout>
	);
}

export default withAuthentication(Page, { displayName: 'ProjectPage' });
