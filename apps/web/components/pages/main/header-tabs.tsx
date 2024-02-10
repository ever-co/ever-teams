import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import React from 'react';
import LinkWrapper from '../kanban/link-wrapper';
import { QueueListIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/20/solid';
import KanbanIcon from '@components/ui/svgs/kanban';
import { IssuesView } from '@app/constants';
import { useRecoilState } from 'recoil';
import { headerTabs } from '@app/stores/header-tabs';

const HeaderTabs = ({ linkAll }: { linkAll: boolean }) => {
	const options = [
		{ label: 'Cards', icon: QueueListIcon, view: IssuesView.CARDS },
		{ label: 'Table', icon: TableCellsIcon, view: IssuesView.TABLE },
		{ label: 'Blocks', icon: Squares2X2Icon, view: IssuesView.BLOCKS },
		{ label: 'Kanban', icon: KanbanIcon, view: IssuesView.KANBAN }
	];
	const links = linkAll ? ['/', '/', '/', '/kanban'] : [undefined, undefined, undefined, '/kanban'];
	const [view, setView] = useRecoilState(headerTabs);

	return (
		<>
			{options.map(({ label, icon: Icon, view: optionView },index) => (
				<Tooltip key={label} label={label} placement="top-start">
					<LinkWrapper isRoute={!!links[index]} href={links[index]}>
						<button
							className={clsxm(
								'rounded-md p-2 text-gray-700 dark:text-gray-300',
								view === optionView && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
							)}
							onClick={() => setView(optionView)}
						>
							<Icon
								className={clsxm(
									'w-5 h-5 inline text-gray-600 dark:text-gray-400',
									view === optionView && 'dark:text-white text-gray-800'
								)}
							/>
						</button>
					</LinkWrapper>
				</Tooltip>
			))}
		</>
	);
};

export default HeaderTabs;
