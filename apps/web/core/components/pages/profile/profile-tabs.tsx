import StatusDropdown from '@/core/components/tasks/status-dropdown';
import { Button } from '@/core/components';
import { clsxm } from '@/core/lib/utils';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction } from 'react';

export type IProfileTabs = 'worked' | 'assigned' | 'unassigned';

const TAB_CLASS_NAME =
	'relative cursor-pointer whitespace-nowrap pb-3 pt-2 text-sm font-medium text-foreground/55 transition-colors hover:text-foreground/80';

const ACTIVE_TAB_CLASS_NAME = 'text-primary-ink hover:text-primary-ink';

const TAB_INDICATOR_CLASS_NAME = 'pointer-events-none absolute inset-x-0 bottom-0 h-0.75 rounded-t-full bg-primary';

export function ProfileTabs({ tab, setTab }: { tab: IProfileTabs; setTab: Dispatch<SetStateAction<IProfileTabs>> }) {
	const t = useTranslations();
	return (
		<div className="my-10 flex w-full items-end justify-between hairline-b border-border">
			<div className="flex gap-6">
				<div
					className={clsxm(TAB_CLASS_NAME, tab === 'worked' && ACTIVE_TAB_CLASS_NAME)}
					onClick={() => setTab('worked')}
				>
					{t('task.taskLabel.WORK_LABEL')}
					{tab === 'worked' && <div className={TAB_INDICATOR_CLASS_NAME} />}
				</div>
				<div
					className={clsxm(TAB_CLASS_NAME, tab === 'assigned' && ACTIVE_TAB_CLASS_NAME)}
					onClick={() => setTab('assigned')}
				>
					{t('task.taskLabel.TASK_ASSIGNED')}
					{tab === 'assigned' && <div className={TAB_INDICATOR_CLASS_NAME} />}
				</div>
				<div
					className={clsxm(TAB_CLASS_NAME, tab === 'unassigned' && ACTIVE_TAB_CLASS_NAME)}
					onClick={() => setTab('unassigned')}
				>
					{t('task.taskLabel.TASK_UNASSIGNED')}
					{tab === 'unassigned' && <div className={TAB_INDICATOR_CLASS_NAME} />}
				</div>
			</div>
			<div className="flex items-center gap-4 pb-2">
				<div className="relative z-10 h-full">
					<StatusDropdown />
				</div>
				<Button size="default" className="w-[140px]">
					{t('task.taskLabel.BUTTON_LABEL')}
				</Button>
			</div>
		</div>
	);
}
