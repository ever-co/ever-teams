import { IssuesView } from '@/core/constants/config/constants';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import { GridView, ListView, Table } from '@/core/components/icons';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useAtom } from 'jotai';
import { Tooltip } from '../../duplicated-components/tooltip';
import { SegmentedControl } from '@/core/components/common/segmented-control';

const VIEW_OPTIONS = [
	{ label: 'CARDS', icon: ListView, view: IssuesView.CARDS },
	{ label: 'TABLE', icon: Table, view: IssuesView.TABLE },
	{ label: 'BLOCKS', icon: GridView, view: IssuesView.BLOCKS }
] as const;

/** The view switch of the daily plans: the segmented control, its thumb sliding to the picked view. */
export default function ViewsHeaderTabs() {
	const t = useTranslations();
	const [view, setView] = useAtom(dailyPlanViewHeaderTabs);

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
