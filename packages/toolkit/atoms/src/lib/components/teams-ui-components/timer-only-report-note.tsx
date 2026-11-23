import { Card, cn } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';

interface ITimerOnlyReportNoteProps {
	label: string;
	className?: string;
}

/**
 * What a report widget shows in place of its report when the kit holds an embed token, which the API refuses on every
 * report route (#5602).
 */
const TimerOnlyReportNote = ({ label, className }: Readonly<ITimerOnlyReportNoteProps>) => {
	const { t } = useTranslation();
	return (
		<Card
			className={cn(
				'dark:text-white border relative dark:border-gray-600 text-sm rounded-xl p-3 min-w-[150px] max-w-sm gap-1 inline-flex flex-col',
				className
			)}
		>
			<span className="text-xs dark:text-white/50 text-gray-400">{label}</span>
			<p className="text-sm text-pretty">{t('REPORT.timer_only')}</p>
		</Card>
	);
};

export { TimerOnlyReportNote };
