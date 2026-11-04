import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useAtom } from 'jotai';
import { GridView, ListView } from '@/core/components/icons';
import { IssuesView } from '@/core/constants/config/constants';
import { allTeamsHeaderTabs } from '@/core/stores/common/header-tabs';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { SegmentedControl } from '@/core/components/common/segmented-control';

const VIEW_OPTIONS = [
	{ label: 'TEAMS', icon: ListView, view: IssuesView.CARDS },
	{ label: 'COMBINE', icon: GridView, view: IssuesView.BLOCKS }
] as const;

/** The view switch of the all-teams page: the segmented control, its thumb sliding to the picked view. */
export function HeaderTabs() {
	const t = useTranslations();
	const [view, setView] = useAtom(allTeamsHeaderTabs);

	const items = VIEW_OPTIONS.map(({ label, icon: Icon, view: optionView }) => ({
		value: optionView,
		icon: <Icon />,
		ariaLabel: t(`common.${label}` as DottedLanguageObjectStringPaths)
	}));

	return (
		<SegmentedControl
			items={items}
			value={view}
			onValueChange={setView}
			ariaLabel={t('common.VIEW')}
			renderItem={(item, button) => (
				<Tooltip label={item.ariaLabel ?? ''} placement="top-start" className="z-20">
					{button}
				</Tooltip>
			)}
		/>
	);
}
