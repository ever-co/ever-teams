'use client';
import { Breadcrumb, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';

import { fullWidthState } from '@app/stores/fullWidth';
import { TaskTable } from '@components/pages/team/tasks/TaskTable';

import { useOrganizationTeams } from '@app/hooks';
import { withAuthentication } from '@/lib/app/authenticator';
const TeamTask = () => {
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const fullWidth = useAtomValue(fullWidthState);
	const currentLocale = params ? params.locale : null;
	const { activeTeam } = useOrganizationTeams();
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: "Team's Task", href: `/${currentLocale}/team/task` }
		],
		[activeTeam?.name, currentLocale]
	);

	return (
		<MainLayout childrenClassName="bg-white dark:bg-dark--theme">
			<Container fullWidth={fullWidth} className="mt-16">
				<Breadcrumb paths={breadcrumbPath} className="text-sm  mb-10" />
				<TaskTable />
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(TeamTask, { displayName: 'TeamTask' });
