import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { useState } from 'react';

type ITab = 'worked' | 'assigned' | 'unassigned';
type ITabs = { tab: ITab; name: string; count: number };

export function useTaskFilter() {
	const [tab, setTab] = useState<ITab>('worked');
	const tabs: ITabs[] = [
		{
			tab: 'worked',
			name: 'Worked',
			count: 0,
		},
		{
			tab: 'assigned',
			name: 'Assigned',
			count: 0,
		},
		{
			tab: 'unassigned',
			name: 'Unassigned',
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
		</div>
	);
}

function TabsNav({ hook }: { hook: I_TaskFilter }) {
	return (
		<nav className="flex space-x-4">
			{hook.tabs.map((item) => {
				const active = item.tab === hook.tab;
				return (
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
				);
			})}
		</nav>
	);
}
