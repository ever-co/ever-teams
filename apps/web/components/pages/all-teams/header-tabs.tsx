import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useAtom } from 'jotai';
import { QueueListIcon, Squares2X2Icon } from '@heroicons/react/20/solid';
import { IssuesView } from '@app/constants';
import { allTeamsHeaderTabs } from '@app/stores/header-tabs';
import { Tooltip } from 'lib/components';
import { clsxm } from '@app/utils';

export function HeaderTabs() {
	const t = useTranslations();
	const options = [
		{ label: 'TEAMS', icon: QueueListIcon, view: IssuesView.CARDS },
		{ label: 'COMBINE', icon: Squares2X2Icon, view: IssuesView.BLOCKS }
	];

	const [view, setView] = useAtom(allTeamsHeaderTabs);

	return (
		<>
			{options.map(({ label, icon: Icon, view: optionView }) => (
				<Tooltip
					className="z-20"
					key={label}
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
		</>
	);
}
