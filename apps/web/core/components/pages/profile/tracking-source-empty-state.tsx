import { useTranslations } from 'next-intl';
import { DESKTOP_APP_DOWNLOAD_URL } from '@/core/constants/config/constants';
import { Analytics } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';

/**
 * Empty state of the screenshots, apps and visited sites sections: the browser timer records none of
 * them, so the label alone reads like missing data. Worded for any viewer, since a manager sees it on
 * a member's card too.
 */
export function TrackingSourceEmptyState({ label }: Readonly<{ label: string }>) {
	const t = useTranslations();

	return (
		<div className="flex flex-col items-center gap-1 text-center">
			<div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
				<Analytics className="size-5" />
			</div>
			<p className="text-sm font-semibold text-balance text-foreground">{label}</p>
			<p className="max-w-sm text-sm text-balance text-muted-foreground">{t('timer.TRACKING_SOURCE_HINT')}</p>
			{DESKTOP_APP_DOWNLOAD_URL && (
				<Button asChild variant="outline" size="default" className="mt-3">
					<a href={DESKTOP_APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
						{t('timer.DOWNLOAD_DESKTOP_APP')}
					</a>
				</Button>
			)}
		</div>
	);
}
