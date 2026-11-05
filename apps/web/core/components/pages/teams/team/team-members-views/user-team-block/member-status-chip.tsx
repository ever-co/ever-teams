import { useTranslations } from 'next-intl';
import { clsxm } from '@/core/lib/utils';
import { ETimerStatus } from '@/core/types/generics/enums/timer';

const CHIP_TONE_BY_STATUS: Record<ETimerStatus, string> = {
	[ETimerStatus.RUNNING]: 'bg-success/10 text-success-foreground',
	[ETimerStatus.ONLINE]: 'bg-success/10 text-success-foreground',
	[ETimerStatus.PAUSE]: 'bg-warning/10 text-warning-foreground',
	[ETimerStatus.IDLE]: 'bg-foreground/5 text-muted-foreground',
	[ETimerStatus.SUSPENDED]: 'bg-foreground/5 text-muted-foreground'
};

const DOT_TONE_BY_STATUS: Record<ETimerStatus, string> = {
	[ETimerStatus.RUNNING]: 'bg-success',
	[ETimerStatus.ONLINE]: 'bg-success',
	[ETimerStatus.PAUSE]: 'bg-warning',
	[ETimerStatus.IDLE]: 'bg-muted-foreground/60',
	[ETimerStatus.SUSPENDED]: 'bg-muted-foreground/30'
};

/**
 * The live status of a member as a soft pair with a dot. The suspended state has no translated label yet, so
 * it renders nothing here and stays on the avatar dot.
 */
export function MemberStatusChip({ status }: Readonly<{ status: ETimerStatus }>) {
	const t = useTranslations();
	const labelByStatus: Partial<Record<ETimerStatus, string>> = {
		[ETimerStatus.RUNNING]: t('common.WORKING'),
		[ETimerStatus.PAUSE]: t('common.PAUSED'),
		[ETimerStatus.ONLINE]: t('common.ONLINE'),
		[ETimerStatus.IDLE]: t('common.NOT_WORKING')
	};
	const label = labelByStatus[status];

	if (!label) {
		return null;
	}

	return (
		<span
			className={clsxm(
				'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
				CHIP_TONE_BY_STATUS[status]
			)}
		>
			<span className={clsxm('size-1.5 rounded-full', DOT_TONE_BY_STATUS[status])} aria-hidden="true" />
			{label}
		</span>
	);
}
