import ProgressBar from '../../duplicated-components/progress-bar';
import { Clock } from '@/core/components/icons';
import { useTranslations } from 'next-intl';

interface ActivityLevelCellProps {
	activity: number;
	duration: number;
}

export function ActivityLevelCell({ activity, duration }: ActivityLevelCellProps) {
	const t = useTranslations();

	if (duration === 0) {
		return (
			<div className="flex gap-2 items-center text-sm text-muted-foreground">
				<Clock className="size-4" />
				<span>{t('timeActivity.NO_ACTIVITY')}</span>
			</div>
		);
	}

	return (
		<div className="flex gap-3 items-center">
			<div className="flex-1 max-w-[120px]">
				<ProgressBar progress={activity} color="bg-primary" size="sm" />
			</div>
			<span className="w-10 text-right font-medium tabular-nums text-foreground">{activity}%</span>
		</div>
	);
}
