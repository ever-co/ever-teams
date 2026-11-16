'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Building } from '@/core/components/icons';
import { useTabOrganization } from '@/core/hooks/auth/use-tab-organization';
import { cn } from '@/core/lib/helpers';

/** The quiet link of the notices, beside their main action. */
const QUIET_ACTION =
	'min-w-0 max-w-full cursor-pointer truncate rounded-sm text-xs font-medium text-muted-foreground underline decoration-foreground/25 underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

/**
 * Says that another tab opened another organization (#5134). The organization and session cookies are shared by every
 * tab: this one keeps working in its own organization, with its timer, and says so; once it can no longer (its token for
 * that organization is gone), it asks where it works. The other organization opens here only once this tab's timer is
 * stopped, so that a run never goes on unseen in the organization left behind.
 */
export function TabOrganizationNotice({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const {
		state,
		ownOrganizationName,
		isTimerRunning,
		canBringOwnOrganizationBack,
		openSharedOrganization,
		bringOwnOrganizationBack
	} = useTabOrganization();
	if (state === 'shared') {
		return null;
	}

	const organization = ownOrganizationName;
	const isLost = state === 'lost';
	const description = (
		<>
			{isLost
				? t('tabOrganizationNotice.CANNOT_WORK')
				: t('tabOrganizationNotice.KEEPS_WORKING', { organization })}
			{isTimerRunning && (
				<span className="block">{t('tabOrganizationNotice.STOP_TIMER_FIRST', { organization })}</span>
			)}
		</>
	);
	const bringBack = canBringOwnOrganizationBack && (
		<button type="button" onClick={bringOwnOrganizationBack} className={QUIET_ACTION}>
			{t('tabOrganizationNotice.BRING_BACK', { organization })}
		</button>
	);
	const actions = (
		<span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
			{bringBack}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={openSharedOrganization}
				disabled={isTimerRunning}
				className="min-w-0 max-w-full"
			>
				<span className="truncate">{t('tabOrganizationNotice.OPEN_HERE')}</span>
			</Button>
		</span>
	);

	return (
		<Notice
			tone={isLost ? 'warning' : 'info'}
			glyph={<Building />}
			title={
				isLost
					? t('tabOrganizationNotice.CANNOT_WORK_TITLE', { organization })
					: t('tabOrganizationNotice.TITLE')
			}
			description={description}
			actions={actions}
			className={cn('w-full', className)}
		/>
	);
}
