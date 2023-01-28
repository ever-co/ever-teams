import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button, Tooltip, VerticalSeparator } from 'lib/components';
import { SearchNormalIcon, Settings4Icon } from 'lib/components/svgs';
import { useState } from 'react';

type ITab = 'worked' | 'assigned' | 'unassigned';
type ITabs = {
	tab: ITab;
	name: string;
	count: number;
	description: string;
};

export function useTaskFilter() {
	const [tab, setTab] = useState<ITab>('worked');
	const tabs: ITabs[] = [
		{
			tab: 'worked',
			name: 'Worked',
			count: 0,
			description: 'This tab shows all tasks you started working on',
		},
		{
			tab: 'assigned',
			name: 'Assigned',
			description: 'This tab shows all tasks that are assigned to you',
			count: 0,
		},
		{
			tab: 'unassigned',
			name: 'Unassigned',
			count: 0,
			description: 'This tab shows all tasks that are not assigned to you',
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
	return (
		<div className="flex space-x-5 items-center">
			<button className="outline-none">
				<SearchNormalIcon className="dark:stroke-white" />
			</button>

			<VerticalSeparator />

			<button className="p-3 px-5 flex space-x-2 input-border rounded-xl items-center">
				<Settings4Icon className="dark:stroke-white" />
				<span>{'Filter'}</span>
			</button>

			<Button>{'Assign Task'}</Button>
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
