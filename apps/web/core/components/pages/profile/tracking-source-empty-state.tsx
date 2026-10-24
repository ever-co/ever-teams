import { useTranslations } from 'next-intl';
import { DESKTOP_APP_DOWNLOAD_URL } from '@/core/constants/config/constants';

/**
 * Empty state of the screenshots, apps and visited sites sections: the browser timer records none of
 * them, so the label alone reads like missing data. Worded for any viewer, since a manager sees it on
 * a member's card too.
 */
export function TrackingSourceEmptyState({ label }: Readonly<{ label: string }>) {
	const t = useTranslations();

	return (
		<div className="flex flex-col items-center gap-2 text-center">
			<p>{label}</p>
			<p className="text-sm text-muted-foreground">{t('timer.TRACKING_SOURCE_HINT')}</p>
			{DESKTOP_APP_DOWNLOAD_URL && (
				<a
					href={DESKTOP_APP_DOWNLOAD_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm font-medium text-primary underline-offset-2 hover:underline dark:text-primary-light"
				>
					{t('timer.DOWNLOAD_DESKTOP_APP')}
				</a>
			)}
		</div>
	);
}
