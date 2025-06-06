import { clsxm } from '@/core/lib/utils';
import LinkWrapper from './link-wrapper';
import { QueueListIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/20/solid';
import KanbanIcon from '@/core/components/svgs/kanban';
import { IssuesView } from '@/core/constants/config/constants';
import { useAtom } from 'jotai';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Tooltip } from '../duplicated-components/tooltip';

const HeaderTabs = ({ linkAll, kanban = false }: { linkAll: boolean; kanban?: boolean }) => {
	const t = useTranslations();
	const options = [
		{ label: 'CARDS', icon: QueueListIcon, view: IssuesView.CARDS },
		{ label: 'TABLE', icon: TableCellsIcon, view: IssuesView.TABLE },
		{ label: 'BLOCKS', icon: Squares2X2Icon, view: IssuesView.BLOCKS },
		{ label: 'KANBAN', icon: KanbanIcon, view: IssuesView.KANBAN }
	];
	const links = linkAll ? ['/', '/', '/', '/kanban'] : [undefined, undefined, undefined, '/kanban'];
	const [view, setView] = useAtom(headerTabs);
	const activeView = kanban ? IssuesView.KANBAN : view;
	return (
		<>
			{options.map(({ label, icon: Icon, view: optionView }, index) => (
				<Tooltip
					key={label}
					label={t(`common.${label}` as DottedLanguageObjectStringPaths)}
					placement="top-start"
					className="z-20"
				>
					<LinkWrapper isRoute={!!links[index]} href={links[index]}>
						<button
							className={clsxm(
								'rounded-md p-2 text-gray-700 dark:text-gray-300',
								activeView === optionView &&
									'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
							)}
							onClick={() => {
								if (links[index] !== '/kanban') {
									setView(optionView);
								}
							}}
						>
							<Icon
								className={clsxm(
									'w-5 h-5 inline text-gray-600 dark:text-gray-400',
									activeView === optionView && 'dark:text-white text-gray-800'
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
