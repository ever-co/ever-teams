import * as React from 'react';
import { useTaskViewsQuery } from '@/core/hooks/task-views/use-task-views-query';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { builtInViewLabelKey } from '@/core/lib/utils/task-views-index';
import { TASK_BUILT_IN_VIEWS } from '@/core/types/interfaces/common/task-views';

/** The saved views the sidebar lists (the first in sidebar order); All views has every one of them. */
const SIDEBAR_SAVED_VIEWS_MAX = 8;
import {
	Bot,
	Calendar,
	Chart,
	Clock,
	Dashboard,
	Folder,
	Home,
	FileText,
	Inbox,
	LayoutGrid,
	Archive,
	Plus,
	Spinner,
	Star,
	Task,
	X,
	Layers,
	MessageSquare
} from '@/core/components/icons/hugeicons';

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarTrigger,
	SidebarMenuSubButton,
	SidebarFooter
} from '@/core/components/common/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPathActive, stripLocalePrefix } from '@/core/lib/utils/navigation-path';
import { NAV_ROW_ACTIVE_RECIPE, NAV_ROW_RECIPE } from './nav-row-recipe';
import { cn } from '@/core/lib/helpers';
import { isValidProjectForDisplay, projectBelongsToTeam } from '@/core/lib/helpers/type-guards';
import { useModal } from '@/core/hooks';
import { useDeleteFavorite } from '@/core/hooks/favorites/use-delete-favorite';
import { useTranslations } from 'next-intl';
import { SidebarOptInForm } from './sidebar-opt-in-form';
import { LazyUserNavAvatar } from '@/core/components/optimized-components/dashboard';
import { UserNavAvatarSkeleton } from '@/core/components/common/skeleton/user-nav-avatar-skeleton';
import { useMemo } from 'react';
import { TaskIssueStatus } from '../tasks/task-issue';
import { WorkspacesSwitcher } from '../common/workspace-switcher';
import { AppRail, APP_RAIL_SIDEBAR_CLASS } from '../common/app-switcher/app-rail';
import { SidebarAppSwitcher } from '../common/app-switcher/sidebar-app-switcher';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { LazyCreateTeamModal } from '@/core/components/optimized-components/teams';
import { LazySidebarCommandModal } from '@/core/components/optimized-components/common';
import { NavHome } from '../nav-home';
import { NavMain } from './nav-main';
import { Suspense } from 'react';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { useFavoritesQuery } from '@/core/hooks/favorites/use-favorites-query';
import {
	activeTeamState,
	activeTeamTaskState,
	isTeamManagerState,
	tasksByTeamState,
	timerStatusState
} from '@/core/stores';
import { CreateProjectModal } from '../features/projects/create-project-modal';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import {
	SidebarCount,
	SidebarCreateProjectRow,
	SidebarProjectMenu,
	SidebarProjectTile,
	SidebarTrackingMark
} from './sidebar-projects';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { APP_NAME } from '@/core/constants/config/constants';
import { GlobalAllPlansModal } from '../daily-plan';
import { GlobalAssignTaskModal } from '../features/tasks/global-assign-task-modal';
import { GlobalProjectActionModal } from '../features/projects/global-project-action-modal';
import { useSidebarDataOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { getMyWorkNavigation } from './my-work-navigation';
import { isInboxEnabled } from '@/core/lib/utils/inbox-enabled';
import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import { CommandPaletteTrigger } from './default-layout/header/command-palette-trigger';
import { DefaultCreateAction } from '../features/layouts/header/create-default-action';
import { SettingsNav } from '../settings/kit/settings-nav';
import { isSettingsPath } from '../settings/kit/settings-entries';
import { useRememberAppPath } from '@/core/hooks/common/use-remember-app-path';
import { isDocsEnabled } from '@/core/lib/utils/docs-enabled';
import { useDocsAvailability } from '@/core/hooks/docs/use-docs-availability';
import { useChatStates } from '@/core/hooks/chat/use-chat-conversations';
import { useInboxAvailability } from '@/core/hooks/inbox/use-inbox-availability';
import { useInboxCounts } from '@/core/hooks/inbox/use-inbox-items';
import { useUnreadNotificationCount } from '@/core/hooks/notifications/use-notification-inbox';

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & { publicTeam: boolean | undefined };

// Limit to 5 projects for sidebar display
const MAX_SIDEBAR_PROJECTS = 5;

/**
 * The sidebar sits on the window background (variant `inset`): the pages render in the rounded panel
 * beside it. Its header carries the workspace switcher with the collapse button, then the palette
 * search, the quick-create menu and the assistant; the account menu closes it at the foot.
 */
export function AppSidebar({ publicTeam, ...props }: AppSidebarProps) {
	const { data: user } = useUserQuery();
	const username = user?.name || user?.firstName || user?.lastName || user?.username;

	const isTeamManager = useAtomValue(isTeamManagerState);
	// The Docs entry needs the flag and a platform that serves documents (one shared probe per page load).
	const docsAvailability = useDocsAvailability(isDocsEnabled());
	// What waits behind the Inbox and Chat rows: the inbox's own unread count where the platform has the inbox (the
	// bell's count elsewhere), and the unread messages of the conversations that are not muted.
	const inboxEnabled = isInboxEnabled();
	const { availability: inboxAvailability } = useInboxAvailability(inboxEnabled);
	const inboxCounts = useInboxCounts(inboxEnabled && inboxAvailability === 'available');
	const notificationsUnread = useUnreadNotificationCount();
	const inboxUnread = inboxAvailability === 'available' ? inboxCounts.unread : notificationsUnread;
	const { unread: chatUnread } = useChatStates(isChatEnabled());
	// The saved views of the team, listed under Views when the feature is on (an empty list otherwise).
	const { views: savedViews } = useTaskViewsQuery();
	const { currentEmployeeFavorites } = useFavoritesQuery();
	const tasks = useAtomValue(tasksByTeamState);
	const { isOpen, closeModal } = useModal();
	const t = useTranslations();
	const { organizationProjects } = useSidebarDataOwner(publicTeam);
	const activeTeam = useAtomValue(activeTeamState);
	const pathname = usePathname();
	const myWorkNavigation = getMyWorkNavigation(user?.id, username || undefined);

	// The sidebar lists the projects of the team picked in the header. "All teams" is the
	// /all-teams page (the header entry links there), not a cleared team: activeTeamState falls
	// back to the first team, so `!activeTeam` never meant "all" and every project used to show.
	const showAllTeams = Boolean(pathname?.includes('/all-teams'));
	const validProjects = useMemo(() => {
		return organizationProjects.filter((project) => {
			if (!isValidProjectForDisplay(project)) return false;

			if (showAllTeams || !activeTeam?.id) return true;

			// A project the API returned without its `teams` relation cannot be placed: keep it.
			if (project.teams === undefined) return true;

			return projectBelongsToTeam(project, activeTeam.id);
		});
	}, [organizationProjects, activeTeam, showAllTeams]);

	const archivedProjectsCount = useMemo(() => {
		const archivedProjects = organizationProjects.filter((project) => {
			const isArchivedProject = isValidProjectForDisplay(project, true);
			if (!isArchivedProject) return false;
			if (showAllTeams || !activeTeam?.id) return true;
			if (project.teams === undefined) return true;
			return projectBelongsToTeam(project, activeTeam.id);
		});
		return archivedProjects.length;
	}, [organizationProjects, activeTeam, showAllTeams]);

	const displayedProjects = useMemo(() => validProjects.slice(0, MAX_SIDEBAR_PROJECTS), [validProjects]);
	const projectsCount = validProjects.length;

	const timerStatus = useAtomValue(timerStatusState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const trackedProjectId = trackedProjectIdOf(Boolean(timerStatus?.running), activeTeamTask?.projectId);

	const createProjectModal = useModal();
	const hasOpenedCreateProject = useHasBeenOpen(createProjectModal.isOpen);
	const openCreateProject = createProjectModal.openModal;
	const canCreateProject = Boolean(user?.isEmailVerified);

	const currentEmployeeFavoritesTasks = useMemo(() => {
		const taskIds = currentEmployeeFavorites
			.filter((el) => el.entity === EBaseEntityEnum.Task)
			.map((el) => el.entityId);

		return tasks.filter((task) => taskIds.includes(task.id));
	}, [tasks, currentEmployeeFavorites]);

	const encodedUsername = encodeURIComponent(username || '');
	const hasFavoriteTasks = currentEmployeeFavoritesTasks.length > 0;
	const userId = user?.id;
	const activeTeamId = activeTeam?.id;

	const homeEntries = useMemo(() => {
		const inboxEntry = {
			title: t('sidebar.INBOX'),
			url: '/inbox',
			selectable: true,
			icon: Inbox,
			label: 'inbox',
			badge: inboxUnread
		};
		const homeEntry = {
			title: t('sidebar.HOME'),
			url: '/',
			selectable: true,
			icon: Home,
			label: 'home'
		};
		const calendarEntry = {
			title: t('common.CALENDAR'),
			url: '/calendar',
			selectable: true,
			icon: Calendar,
			label: 'calendar'
		};
		// /inbox has no page yet (404 for every user who clicks it). Gated, not removed: flip
		// NEXT_PUBLIC_INBOX_ENABLED=true when the route ships (read at runtime: no rebuild of the image).
		// The team chat ships behind NEXT_PUBLIC_CHAT_ENABLED (read at runtime); the assistant keeps its own row.
		const chatEntry = {
			title: t('teamChat.TITLE'),
			url: '/chat',
			selectable: true,
			icon: MessageSquare,
			label: 'chat',
			badge: chatUnread
		};
		// Docs ships behind NEXT_PUBLIC_DOCS_ENABLED (read at runtime), after the inbox and before the calendar.
		const docsEntry = {
			title: t('docs.TITLE'),
			url: '/docs',
			selectable: true,
			icon: FileText,
			label: 'docs'
		};
		const entries: Array<typeof homeEntry & { badge?: number }> = [homeEntry];
		if (isInboxEnabled()) entries.push(inboxEntry);
		if (isChatEnabled()) entries.push(chatEntry);
		if (isDocsEnabled() && docsAvailability !== 'unavailable') entries.push(docsEntry);
		entries.push(calendarEntry);
		return entries;
	}, [chatUnread, docsAvailability, inboxUnread, t]);

	const navMain = useMemo(() => {
		const favoriteItems = hasFavoriteTasks
			? currentEmployeeFavoritesTasks
					.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
					.map((task) => ({
						title: task?.title,
						url: '#',
						component: <FavoriteTaskItem task={task} />
					}))
			: [
					{
						title: t('common.NO_FAVORITE_TASK'),
						url: '#',
						label: 'no-task'
					}
				];

		const trackingLabel = t('sidebar.TRACKING_PROJECT');
		const projectItems = displayedProjects.map((project) => {
			const isTracked = project.id === trackedProjectId;
			return {
				title: project.name ?? '',
				label: 'project',
				url: `/projects/${project.id}`,
				icon: <SidebarProjectTile project={project} />,
				trailing: isTracked && <SidebarTrackingMark label={trackingLabel} />,
				actions: <SidebarProjectMenu project={project} />
			};
		});

		const hasProjects = projectsCount > 0;
		const showsCreateProjectRow = !hasProjects && canCreateProject;
		const createProjectItems = [];
		if (showsCreateProjectRow) {
			createProjectItems.push({
				title: t('sidebar.CREATE_PROJECT'),
				url: '#',
				label: 'create-project',
				component: <SidebarCreateProjectRow onCreate={openCreateProject} />
			});
		}

		let createProjectAction: { label: string; icon: React.ReactNode; onClick: () => void } | undefined;
		if (canCreateProject) {
			createProjectAction = { label: t('sidebar.CREATE_PROJECT'), icon: <Plus />, onClick: openCreateProject };
		}

		const allProjectsItem = {
			title: t('sidebar.ALL_PROJECTS'),
			url: '/projects',
			label: 'view-all-projects',
			icon: <LayoutGrid className="size-4 text-foreground/55" />,
			trailing: hasProjects && <SidebarCount value={projectsCount} />
		};

		const archivedProjectsItem = {
			title: t('sidebar.ARCHIVED_PROJECTS'),
			url: '/projects?archived=true',
			label: 'archived-projects',
			icon: <Archive className="size-4 text-foreground/55" />,
			trailing: archivedProjectsCount > 0 && <SidebarCount value={archivedProjectsCount} />
		};

		const reportsEntry = {
			title: t('sidebar.REPORTS'),
			label: 'reports',
			url: '#',
			selectable: false,
			icon: Chart,
			items: [
				{
					title: t('sidebar.TIMESHEETS'),
					url: `/reports/timesheet/${userId}?name=${encodedUsername}`,
					label: 'reports-timesheets'
				},
				{
					title: t('sidebar.MANUAL_TIME_EDIT'),
					label: 'reports-manual-time-edit',
					url: '/reports/manual-time-edits'
				},
				{
					title: t('sidebar.WEEKLY_LIMIT'),
					label: 'reports-weekly-limit',
					url: '/reports/weekly-limit'
				},
				{
					title: t('sidebar.ACTUAL_AND_EXPECTED_HOURS'),
					label: 'reports-actual-and-expected-hours',
					url: '/reports/actual-and-expected-hours'
				},
				{
					title: t('sidebar.PAYMENTS_DUE'),
					label: 'reports-payments-due',
					url: '/reports/payments-due'
				},
				{
					title: t('sidebar.PROJECT_BUDGET'),
					label: 'reports-project-budget',
					url: '/reports/project-budget'
				},
				{
					title: t('sidebar.TIME_AND_ACTIVITY'),
					label: 'reports-time-and-activity',
					url: '/reports/time-and-activity'
				}
			]
		};

		return [
			{
				title: t('sidebar.DASHBOARD'),
				url: '#',
				selectable: false,
				icon: Dashboard,
				label: 'dashboard',
				items: [
					{
						title: t('sidebar.TEAM_DASHBOARD'),
						url: `/dashboard/team-dashboard/${activeTeamId ?? userId}?name=${encodedUsername}`,
						label: 'team dashboard'
					},
					{
						title: t('sidebar.APPS_AND_URLS'),
						url: `/dashboard/app-url/${userId}?name=${encodedUsername}`,
						label: 'apps-urls'
					}
				]
			},
			{
				title: t('sidebar.FAVORITES'),
				url: '#',
				selectable: false,
				icon: Star,
				label: 'favorites',
				items: favoriteItems
			},
			{
				title: t('sidebar.TASKS'),
				url: '#',
				selectable: false,
				icon: Task,
				label: 'tasks',
				items: [
					{
						title: t('sidebar.TEAMTASKS'),
						url: '/team/tasks',
						label: 'team-tasks'
					},
					{
						title: t('common.KANBAN'),
						url: '/kanban',
						label: 'kanban'
					},
					{
						title: t('sidebar.MY_TASKS'),
						url: `/profile/${userId}?name=${encodedUsername}`,
						label: 'my-tasks'
					}
				]
			},
			...(isTaskViewsEnabled()
				? [
						{
							title: t('taskViews.TITLE'),
							url: '/views',
							selectable: false,
							icon: Layers,
							label: 'views',
							items: [
								...TASK_BUILT_IN_VIEWS.map((key) => ({
									title: t(builtInViewLabelKey(key)),
									url: `/views/${key}`,
									label: `view-${key}`
								})),
								...savedViews.slice(0, SIDEBAR_SAVED_VIEWS_MAX).map((savedView) => ({
									title: savedView.name,
									url: `/views/${savedView.id}`,
									label: `view-${savedView.id}`
								})),
								{ title: t('taskViews.ALL_VIEWS'), url: '/views', label: 'all-views' }
							]
						}
					]
				: []),
			{
				title: t('sidebar.PROJECTS'),
				url: '/projects',
				// The group opens its list; the page itself is reached through "View".
				selectable: false,
				icon: Folder,
				label: 'projects',
				action: createProjectAction,
				items: [...projectItems, ...createProjectItems, allProjectsItem, archivedProjectsItem]
			},
			{
				title: t('sidebar.MY_WORKS'),
				url: '#',
				selectable: false,
				icon: Clock,
				label: 'my-work',
				items: [
					{
						title: t('sidebar.TIME_AND_ACTIVITY'),
						label: 'time-and-activity',
						url: myWorkNavigation.timeAndActivity
					},
					{
						title: t('sidebar.WORK_DIARY'),
						label: 'work-and-diary',
						url: myWorkNavigation.workDiary
					}
				]
			},
			...(isTeamManager ? [reportsEntry] : [])
		];
	}, [
		t,
		hasFavoriteTasks,
		currentEmployeeFavoritesTasks,
		displayedProjects,
		projectsCount,
		archivedProjectsCount,
		trackedProjectId,
		canCreateProject,
		openCreateProject,
		userId,
		activeTeamId,
		encodedUsername,
		myWorkNavigation.timeAndActivity,
		myWorkNavigation.workDiary,
		isTeamManager,
		savedViews
	]);

	const showsSettingsNav = isSettingsPath(stripLocalePrefix(pathname ?? ''));
	useRememberAppPath(pathname, showsSettingsNav);

	const showAccountMenu = !publicTeam;
	const showCreateTeamModal = !publicTeam && isOpen && Boolean(user?.isEmailVerified);
	const appSwitcherPlacement = useAppSwitcherPlacement();
	const showsAppRail = appSwitcherPlacement === 'rail';
	const sidebarClassName = cn('z-1000', showsAppRail && APP_RAIL_SIDEBAR_CLASS);

	return (
		<>
			<AppRail />
			<Sidebar variant="inset" collapsible="icon" className={sidebarClassName} {...props}>
				<SidebarHeader className="gap-2 p-2 group-data-[collapsible=icon]:items-center">
					<div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
						<SidebarAppSwitcher />
						<div className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
							<WorkspacesSwitcher />
						</div>
						<SidebarTrigger className="shrink-0" />
					</div>

					<div className="flex items-center gap-1.5 group-data-[collapsible=icon]:flex-col">
						<CommandPaletteTrigger className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none" />
						<DefaultCreateAction publicTeam={publicTeam} />
					</div>
				</SidebarHeader>

				<SidebarContent className="gap-0">
					{showsSettingsNav && <SettingsNav />}
					{!showsSettingsNav && <NavHome homeData={homeEntries} />}
					{!showsSettingsNav && <AssistantNavItem />}
					{!showsSettingsNav && <NavMain items={navMain} />}
				</SidebarContent>

				<SidebarFooter className="mt-auto gap-2 p-2">
					<SidebarOptInForm />
					{/* The account menu lives here, at the foot of the sidebar, as in Ever Works. On phones the
					    sidebar is a modal sheet that would cover the menu's dialogs, so there the header keeps it. */}
					{showAccountMenu && (
						<div className="hidden hairline-t border-border pt-2 md:block">
							<Suspense fallback={<UserNavAvatarSkeleton variant="sidebar" />}>
								<LazyUserNavAvatar variant="sidebar" />
							</Suspense>
						</div>
					)}
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>

			{showCreateTeamModal && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<LazyCreateTeamModal open={isOpen} closeModal={closeModal} />
				</Suspense>
			)}

			{/* Command palette - rendered once for the entire app (outside the mobile sheet), so its
			    shortcuts work on every page; the sidebar's CommandPaletteTrigger opens it. */}
			<Suspense fallback={null}>
				<LazySidebarCommandModal publicTeam={publicTeam || false} variant="none" />
			</Suspense>

			{/* Rendered once for the entire app. */}
			<GlobalAllPlansModal />

			{/* Rendered once for the entire app: a modal opened from a Popover used to close at once. */}
			<GlobalAssignTaskModal />

			{/* Rendered once for the entire app: avoids the "Maximum update depth exceeded" error on /projects. */}
			<GlobalProjectActionModal />

			{hasOpenedCreateProject && (
				<CreateProjectModal open={createProjectModal.isOpen} closeModal={createProjectModal.closeModal} />
			)}
		</>
	);
}

/** The assistant has a page of its own, like Linear's Agent: a nav row under Home. */
function AssistantNavItem() {
	const t = useTranslations();
	const pathname = usePathname();
	const label = t('chatView.OPEN_ASSISTANT', { appName: APP_NAME });
	const isActive = isPathActive(pathname, ASSISTANT_PATH);

	return (
		<SidebarGroup className="-mt-3">
			<SidebarMenu className="w-full gap-y-0.5 group-data-[collapsible=icon]:items-center">
				<SidebarMenuItem>
					<SidebarMenuButton
						asChild
						isActive={isActive}
						tooltip={label}
						className={cn(
							NAV_ROW_RECIPE,
							'group-data-[collapsible=icon]:justify-center',
							isActive && NAV_ROW_ACTIVE_RECIPE
						)}
					>
						<Link href={ASSISTANT_PATH} aria-current={ariaCurrentFor(isActive)}>
							<Bot aria-hidden="true" />
							<span className="truncate group-data-[collapsible=icon]:hidden">
								{t('chatView.ASSISTANT')}
							</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	);
}

const ASSISTANT_PATH = '/assistant';

function trackedProjectIdOf(isTimerRunning: boolean, projectId: string | null | undefined) {
	if (!isTimerRunning) {
		return null;
	}
	return projectId ?? null;
}

function ariaCurrentFor(isActive: boolean) {
	if (isActive) {
		return 'page' as const;
	}
	return undefined;
}

/**
 * Sidebar | Favorite Task item
 */
const FavoriteTaskItem = ({ task }: { task: TTask }) => {
	const t = useTranslations();
	const { deleteFavorite, deleteFavoriteLoading } = useDeleteFavorite();

	return (
		<SidebarMenuSubButton
			key={task?.id}
			className="group/favorite flex h-8 min-h-8 items-center rounded-md text-muted-foreground transition-colors first:mt-0.5 last:mb-0.5 hover:bg-foreground/5 hover:text-foreground"
			asChild
		>
			<span className="flex w-full min-w-0 items-center gap-1">
				<Link href={`/task/${task?.id}`} className="flex min-w-0 flex-1 items-center gap-2">
					{task && <TaskIssueStatus showIssueLabels={false} className="shrink-0" task={task} />}
					<span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground/70">
						#{task?.taskNumber}
					</span>
					<span className="min-w-0 truncate text-[13px] font-normal">{task?.title}</span>
				</Link>
				{deleteFavoriteLoading && <Spinner className="size-3.5 shrink-0 animate-spin" />}
				{!deleteFavoriteLoading && (
					<button
						type="button"
						aria-label={t('common.REMOVE_FAVORITE_TASK')}
						onClick={() => deleteFavorite(task.id)}
						className={FAVORITE_REMOVE_BUTTON}
					>
						<X className="size-3.5" />
					</button>
				)}
			</span>
		</SidebarMenuSubButton>
	);
};

/** Shown on the row's hover and on keyboard focus, like the row actions of Linear's sidebar. */
const FAVORITE_REMOVE_BUTTON =
	'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-[opacity,color,background-color] hover:bg-foreground/5 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25 group-hover/favorite:opacity-100';
