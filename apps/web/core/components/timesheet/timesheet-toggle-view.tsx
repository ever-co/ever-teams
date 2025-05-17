import { clsxm } from '@/core/lib/utils';
import { TranslationHooks } from 'next-intl';

type TimesheetViewMode = 'ListView' | 'CalendarView';
export type TimesheetDetailMode = 'Pending' | 'MenHours' | 'MemberWork';
type ViewToggleButtonProps = {
	mode: TimesheetViewMode;
	active: boolean;
	icon: React.ReactNode;
	onClick: () => void;
	t: TranslationHooks;
};

export const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({ mode, active, icon, onClick, t }) => (
	<button
		onClick={onClick}
		className={clsxm(
			'box-border text-[#7E7991]  font-medium w-[191px] h-[76px] flex items-center gap-x-4 text-[14px] px-2 py-6',
			active &&
				'border-b-primary text-primary border-b-2 dark:text-primary-light dark:border-b-primary-light bg-[#F1F5F9] dark:bg-gray-800 font-medium'
		)}
	>
		{icon}
		<span>{mode === 'ListView' ? t('pages.timesheet.VIEWS.LIST') : t('pages.timesheet.VIEWS.CALENDAR')}</span>
	</button>
);
ViewToggleButton.displayName = 'ViewToggleButton';
