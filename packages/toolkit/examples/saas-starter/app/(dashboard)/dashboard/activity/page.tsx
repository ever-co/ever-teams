import { getActivityLogs } from '@/lib/db/queries';
import { ActivityLogsList } from './activity-logs-list';
import { getTranslations } from 'next-intl/server';
import { ReactElement } from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	const t = await getTranslations({
		locale,
		namespace: 'Dashboard.ActivityPage'
	});

	return {
		title: t('title'),
		description: t('meta_description')
	};
}

export default async function ActivityPage(): Promise<ReactElement> {
	const logs = await getActivityLogs();
	const t = await getTranslations('Dashboard.ActivityPage');

	return (
		<section>
			<div className="mb-4">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-muted-foreground">{t('description')}</p>
			</div>
			<ActivityLogsList logs={logs} />
		</section>
	);
}
