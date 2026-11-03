import { TabsTrigger } from '@/core/components/common/tabs';
import { TranslationHooks } from 'next-intl';

type TimesheetViewMode = 'ListView' | 'CalendarView';
export type TimesheetDetailMode = 'Pending' | 'MenHours' | 'MemberWork';
type ViewToggleButtonProps = {
	mode: TimesheetViewMode;
	icon: React.ReactNode;
	onClick: () => void;
	t: TranslationHooks;
};

function viewLabel(mode: TimesheetViewMode, t: TranslationHooks) {
	if (mode === 'ListView') {
		return t('pages.timesheet.VIEWS.LIST');
	}
	return t('pages.timesheet.VIEWS.CALENDAR');
}

export const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({ mode, icon, onClick, t }) => (
	<TabsTrigger value={mode} onClick={onClick}>
		{icon}
		<span>{viewLabel(mode, t)}</span>
	</TabsTrigger>
);
ViewToggleButton.displayName = 'ViewToggleButton';
