'use client';

import { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { isTrackingEnabledState } from '@/core/stores';
import { SettingsRouteSkeleton } from '@/core/components/settings/settings-route-skeleton';
import { useLegacySettingsHash, useSettingsBreadcrumb } from '@/core/hooks/settings/use-settings-navigation';

const SettingsLayout = ({ children }: { children: ReactNode }) => {
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const breadcrumb = useSettingsBreadcrumb();
	useLegacySettingsHash();

	return (
		<PageLayout
			showTimer={isTrackingEnabled}
			childrenClassName="w-full"
			breadcrumb={<Breadcrumb paths={breadcrumb} className="min-w-0 text-[13px]" />}
		>
			{children}
		</PageLayout>
	);
};

export default withAuthentication(SettingsLayout, { displayName: 'Settings', skeleton: SettingsRouteSkeleton });
