import { SegmentedControl } from './segmented-control';
import LinkWrapper from './link-wrapper';
import { GridView, Kanban, ListView, Table } from '@/core/components/icons';
import { IssuesView, LAST_SELECTED_TEAM_MEMBERS_VIEW_MODE } from '@/core/constants/config/constants';
import { useAtom } from 'jotai';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Tooltip } from '../duplicated-components/tooltip';

const VIEW_OPTIONS = [
	{ label: 'CARDS', icon: ListView, view: IssuesView.CARDS },
	{ label: 'TABLE', icon: Table, view: IssuesView.TABLE },
	{ label: 'BLOCKS', icon: GridView, view: IssuesView.BLOCKS },
	{ label: 'KANBAN', icon: Kanban, view: IssuesView.KANBAN }
] as const;

const KANBAN_ROUTE = '/kanban';

function linksFor(linkAll: boolean) {
	if (linkAll) {
		return ['/', '/', '/', KANBAN_ROUTE];
	}
	return [undefined, undefined, undefined, KANBAN_ROUTE];
}

function activeViewOf(isKanbanPage: boolean, view: IssuesView) {
	if (isKanbanPage) {
		return IssuesView.KANBAN;
	}
	return view;
}

function setLastTeamMembersViewMode(viewMode: IssuesView) {
	localStorage?.setItem(LAST_SELECTED_TEAM_MEMBERS_VIEW_MODE, viewMode);
}

/** The view switch of the team pages: the segmented control, its thumb sliding to the picked view. */
const HeaderTabs = ({ linkAll, kanban = false }: { linkAll: boolean; kanban?: boolean }) => {
	const t = useTranslations();
	const links = linksFor(linkAll);
	const [view, setView] = useAtom(headerTabs);
	const activeView = activeViewOf(kanban, view);

	const items = VIEW_OPTIONS.map(({ label, icon: Icon, view: optionView }) => ({
		value: optionView,
		icon: <Icon />,
		ariaLabel: t(`common.${label}` as DottedLanguageObjectStringPaths)
	}));

	const handleViewChange = (nextView: IssuesView) => {
		const isKanban = nextView === IssuesView.KANBAN;
		if (isKanban) {
			return;
		}
		setView(nextView);
		setLastTeamMembersViewMode(nextView);
	};

	return (
		<SegmentedControl
			items={items}
			value={activeView}
			onValueChange={handleViewChange}
			ariaLabel={t('common.VIEW')}
			renderItem={(item, button) => {
				const index = VIEW_OPTIONS.findIndex((option) => option.view === item.value);
				const href = links[index];
				return (
					<Tooltip label={item.ariaLabel ?? ''} placement="top-start" className="z-20">
						<LinkWrapper isRoute={Boolean(href)} href={href}>
							{button}
						</LinkWrapper>
					</Tooltip>
				);
			}}
		/>
	);
};

export default HeaderTabs;
