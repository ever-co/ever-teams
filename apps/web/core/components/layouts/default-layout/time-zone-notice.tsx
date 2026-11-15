'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Globe, Spinner } from '@/core/components/icons';
import { useTimeZoneNotice } from '@/core/hooks/settings/use-time-zone-notice';
import { cn } from '@/core/lib/helpers';
import { timeZoneLabelOf } from '@/core/lib/utils/settings-time-zone';
import type { TimeZoneNotice as TTimeZoneNotice } from '@/core/lib/utils/time-zone-notice';

type Translate = ReturnType<typeof useTranslations>;

/** The quiet link of the notices, beside their main action. */
const QUIET_ACTION =
	'min-w-0 max-w-full cursor-pointer truncate rounded-sm text-xs font-medium text-muted-foreground underline decoration-foreground/25 underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

function offsetLabelOf(offset: string, t: Translate): string {
	return t('settings.preferences.UTC_OFFSET', { offset });
}

function titleOf(notice: TTimeZoneNotice, t: Translate): string {
	const browserZone = timeZoneLabelOf(notice.browserZone);
	const browserOffset = offsetLabelOf(notice.browserOffset, t);
	const hasProfileZone = notice.profileZone !== null && notice.profileOffset !== null;
	if (!hasProfileZone) {
		return t('timeZoneNotice.TITLE_NO_PROFILE_ZONE', { browserZone, browserOffset });
	}
	const profileZone = timeZoneLabelOf(notice.profileZone ?? '');
	const profileOffset = offsetLabelOf(notice.profileOffset ?? '', t);
	return t('timeZoneNotice.TITLE', { profileZone, profileOffset, browserZone, browserOffset });
}

function descriptionOf(notice: TTimeZoneNotice, t: Translate): string {
	if (notice.profileZone === null) {
		return t('timeZoneNotice.DESCRIPTION_NO_PROFILE_ZONE');
	}
	return t('timeZoneNotice.DESCRIPTION');
}

function mainActionLabelOf(notice: TTimeZoneNotice, state: { isSaving: boolean; hasFailed: boolean }, t: Translate) {
	if (state.isSaving) {
		return t('timeZoneNotice.SAVING');
	}
	if (state.hasFailed) {
		return t('timeZoneNotice.TRY_AGAIN');
	}
	return t('timeZoneNotice.USE', { zone: timeZoneLabelOf(notice.browserZone) });
}

/**
 * Says once that this browser counts hours in another zone than the profile, which the reports follow, and offers to
 * use the browser's zone or keep the profile's. It sits in the page's flow and never blocks it.
 */
export function TimeZoneNotice({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const { notice, isSaving, hasFailed, adoptBrowserZone, keepProfileZone, dismiss } = useTimeZoneNotice();
	if (!notice) {
		return null;
	}

	const mainLabel = mainActionLabelOf(notice, { isSaving, hasFailed }, t);
	const actions = (
		<span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
			{notice.profileZone && (
				<button type="button" onClick={keepProfileZone} disabled={isSaving} className={QUIET_ACTION}>
					{t('timeZoneNotice.KEEP', { zone: timeZoneLabelOf(notice.profileZone) })}
				</button>
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={adoptBrowserZone}
				disabled={isSaving}
				aria-busy={isSaving}
				className="min-w-0 max-w-full"
			>
				{isSaving && <Spinner aria-hidden="true" className="size-3.5 animate-spin text-muted-foreground" />}
				<span className="truncate">{mainLabel}</span>
			</Button>
		</span>
	);

	if (hasFailed) {
		return (
			<Notice
				tone="error"
				title={t('timeZoneNotice.SAVE_FAILED')}
				description={t('timeZoneNotice.SAVE_FAILED_DESCRIPTION')}
				actions={actions}
				onDismiss={dismiss}
				dismissLabel={t('common.CLOSE')}
				className={cn('w-full', className)}
			/>
		);
	}

	return (
		<Notice
			tone="info"
			glyph={<Globe />}
			title={titleOf(notice, t)}
			description={descriptionOf(notice, t)}
			actions={actions}
			onDismiss={dismiss}
			dismissLabel={t('common.CLOSE')}
			className={cn('w-full', className)}
		/>
	);
}
