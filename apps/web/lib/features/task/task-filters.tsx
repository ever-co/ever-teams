import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button, Tooltip, VerticalSeparator } from 'lib/components';
import { SearchNormalIcon, Settings4Icon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useState } from 'react';

type ITab = 'worked' | 'assigned' | 'unassigned';
type ITabs = {
	tab: ITab;
	name: string;
	count: number;
	description: string;
};

export function useTaskFilter() {
	const { trans } = useTranslation();
	const [tab, setTab] = useState<ITab>('worked');

	const tabs: ITabs[] = [
		{
			tab: 'worked',
			name: trans.common.WORKED,
			description: trans.task.tabFilter.WORKED_DESCRIPTION,
			count: 0,
		},
		{
			tab: 'assigned',
			name: trans.common.ASSIGNED,
			description: trans.task.tabFilter.ASSIGNED_DESCRIPTION,
			count: 0,
		},
		{
			tab: 'unassigned',
			name: trans.common.UNASSIGNED,
			description: trans.task.tabFilter.UNASSIGNED_DESCRIPTION,
			count: 0,
		},
	];

	return {
		tab,
		setTab,
		tabs,
	};
}

export type I_TaskFilter = ReturnType<typeof useTaskFilter>;

export function TaskFilter({
	className,
	hook,
}: IClassName & { hook: I_TaskFilter }) {
	return (
		<div className={clsxm('flex justify-between', className)}>
			<TabsNav hook={hook} />
			<InputFilters />
		</div>
	);
}

function InputFilters() {
	const { trans } = useTranslation();

	return (
		<div className="flex space-x-5 items-center">
			<button className="outline-none">
				<SearchNormalIcon className="dark:stroke-white" />
			</button>

			<VerticalSeparator />

			<button className="p-3 px-5 flex space-x-2 input-border rounded-xl items-center">
				<Settings4Icon className="dark:stroke-white" />
				<span>{trans.common.FILTER}</span>
			</button>

			<Button>{trans.common.ASSIGN_TASK}</Button>
		</div>
	);
}

function TabsNav({ hook }: { hook: I_TaskFilter }) {
	return (
		<nav className="flex space-x-4">
			{hook.tabs.map((item, i) => {
				const active = item.tab === hook.tab;
				return (
					<Tooltip key={i} placement="top-start" label={item.description}>
						<button
							onClick={() => hook.setTab(item.tab)}
							className={clsxm(
								'text-lg text-gray-500 font-normal outline-none p-3 relative',
								active && ['text-primary dark:text-primary-light']
							)}
						>
							{item.name}{' '}
							<span
								className={clsxm(
									'bg-gray-lighter p-1 px-2 text-xs rounded-md',
									active && ['bg-primary dark:bg-primary-light text-white']
								)}
							>
								{item.count}
							</span>
							{active && (
								<div
									className={clsxm(
										'bg-primary dark:bg-primary-light',
										'h-[2px] absolute -bottom-4 left-0 right-0 w-full'
									)}
								/>
							)}
						</button>
					</Tooltip>
				);
			})}
		</nav>
	);
}
