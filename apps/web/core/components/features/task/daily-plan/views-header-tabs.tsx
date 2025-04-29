import { IssuesView } from '@app/constants';
import { dailyPlanViewHeaderTabs } from '@app/stores/header-tabs';
import { clsxm } from '@app/utils';
import { QueueListIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/20/solid';
import { Tooltip } from '@/core/components';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useAtom } from 'jotai';

export default function ViewsHeaderTabs() {
	const t = useTranslations();
	const options = [
		{ label: 'CARDS', icon: QueueListIcon, view: IssuesView.CARDS },
		{ label: 'TABLE', icon: TableCellsIcon, view: IssuesView.TABLE },
		{ label: 'BLOCKS', icon: Squares2X2Icon, view: IssuesView.BLOCKS }
	];

	const [view, setView] = useAtom(dailyPlanViewHeaderTabs);

	return (
		<div className="flex items-center gap-1">
			{options.map(({ label, icon: Icon, view: optionView }) => (
				<Tooltip
					key={label}
					className="z-20"
					label={t(`common.${label}` as DottedLanguageObjectStringPaths)}
					placement="top-start"
				>
					<button
						className={clsxm(
							'rounded-md p-2 text-gray-700 dark:text-gray-300',
							view === optionView && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
						)}
						onClick={() => {
							setView(optionView);
						}}
					>
						<Icon
							className={clsxm(
								'w-5 h-5 inline text-gray-600 dark:text-gray-400',
								view === optionView && 'dark:text-white text-gray-800'
							)}
						/>
					</button>
				</Tooltip>
			))}
		</div>
	);
}
