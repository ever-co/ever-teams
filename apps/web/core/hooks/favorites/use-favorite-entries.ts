'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useChatConversations, useChatStates } from '@/core/hooks/chat/use-chat-conversations';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { useDocsAvailability } from '@/core/hooks/docs/use-docs-availability';
import { useDocsTree } from '@/core/hooks/docs/use-docs-tree';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import { conversationTitle } from '@/core/lib/utils/chat-format';
import { isDocsEnabled } from '@/core/lib/utils/docs-enabled';
import {
	FAVORITE_ENTITY_OF,
	type FavoriteEntry,
	type FavoriteGroup,
	favoriteGroupsOf,
	favoriteIdsOf,
	type UnavailableFavorite
} from '@/core/lib/utils/favorites';
import { queryKeys } from '@/core/query/keys';
import { favoriteService } from '@/core/services/client/api/favorites/favorite.service';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import type { IChatConversationWithState } from '@/core/types/interfaces/common/chat';
import type { IDocumentPage } from '@/core/types/interfaces/common/docs';
import type { TFavoriteTask, TOrganizationProject } from '@/core/types/schemas';
import { useUserQuery } from '../queries/user-user.query';
import { useFavoritesQuery } from './use-favorites-query';

export type FavoriteItemEntry = FavoriteEntry<
	TOrganizationProject,
	TFavoriteTask,
	IDocumentPage,
	IChatConversationWithState
>;

/** A favourite task's details change rarely enough: read again after a minute, or when the favourites change. */
const FAVORITE_TASKS_STALE_MS = 60_000;

interface FavoriteEntriesOptions {
	/** The sidebar reads the projects its own query loads; the Favorites page asks for them itself. */
	loadsProjects: boolean;
}

/**
 * The person's favourites with what their rows show (#5017): projects from the organization's projects, tasks from the
 * active team's (the others of every team in one `GET /favorite/type`), pages from the Docs tree, conversations from
 * the chat. Docs and chat favourites count only where those features are on; each source loads only when the person
 * has favourites of its kind.
 */
export function useFavoriteEntries({ loadsProjects }: FavoriteEntriesOptions) {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';
	const {
		currentEmployeeFavorites,
		isSuccess: areFavoritesLoaded,
		isError: favoritesFailed,
		refetch: refetchFavorites
	} = useFavoritesQuery();

	const projectIds = useMemo(
		() => favoriteIdsOf(currentEmployeeFavorites, FAVORITE_ENTITY_OF.project),
		[currentEmployeeFavorites]
	);
	const taskIds = useMemo(
		() => favoriteIdsOf(currentEmployeeFavorites, FAVORITE_ENTITY_OF.task),
		[currentEmployeeFavorites]
	);
	const documentIds = useMemo(
		() => favoriteIdsOf(currentEmployeeFavorites, FAVORITE_ENTITY_OF.document),
		[currentEmployeeFavorites]
	);

	// Projects
	const {
		organizationProjects,
		isOrganizationProjectsLoaded,
		getOrganizationProjectsLoading,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery({
		enabled: loadsProjects && projectIds.size > 0
	});

	// Tasks: the active team's are at hand; the favourites of other teams come in one request
	const teamTasks = useAtomValue(tasksByTeamState);
	const missingTaskIds = useMemo(() => {
		const known = new Set(teamTasks.map((task) => task.id));
		return [...taskIds].filter((id) => !known.has(id)).sort((a, b) => a.localeCompare(b));
	}, [taskIds, teamTasks]);
	const favoriteTasksQuery = useQuery({
		queryKey: [...queryKeys.favorites.byEmployee(employeeId), 'tasks', missingTaskIds] as const,
		queryFn: ({ signal }) => favoriteService.getFavoriteTasks({ employeeId }, signal),
		enabled: Boolean(employeeId) && missingTaskIds.length > 0,
		staleTime: FAVORITE_TASKS_STALE_MS
	});
	// The team's favourite tasks show at once; the other teams' join them when their request answers
	const tasks = useMemo<TFavoriteTask[]>(() => {
		const fromTeam: TFavoriteTask[] = teamTasks
			.filter((task) => taskIds.has(task.id))
			.map((task) => ({
				id: task.id,
				title: task.title,
				number: task.number,
				prefix: task.prefix,
				taskNumber: task.taskNumber,
				issueType: task.issueType,
				status: task.status
			}));
		const fromTeamIds = new Set(fromTeam.map((task) => task.id));
		const fromOtherTeams = (favoriteTasksQuery.data ?? []).filter((task) => !fromTeamIds.has(task.id));
		return [...fromTeam, ...fromOtherTeams];
	}, [favoriteTasksQuery.data, taskIds, teamTasks]);
	// Until that request answered (or when it failed), its tasks are neither listed nor gone
	const pendingTaskIds = useMemo<ReadonlySet<string>>(
		() => (favoriteTasksQuery.isSuccess ? new Set() : new Set(missingTaskIds)),
		[favoriteTasksQuery.isSuccess, missingTaskIds]
	);

	// Pages, where Docs is on and served
	const docsOn = isDocsEnabled();
	const docsAvailability = useDocsAvailability(docsOn);
	const showsDocuments = docsOn && docsAvailability !== 'unavailable';
	const docsTree = useDocsTree(showsDocuments && documentIds.size > 0);

	// Conversations, where chat is on
	const chatOn = isChatEnabled();
	const { favoriteIds: chatIds } = useChatStates(chatOn);
	const hasChatFavorites = chatOn && chatIds.size > 0;
	const chats = useChatConversations(hasChatFavorites);
	const people = useChatPeople(hasChatFavorites);
	const meEmployeeId = useChatScope()?.employeeId ?? null;
	const unnamed = t('teamChat.UNNAMED');

	const { groups, unavailable } = useMemo(
		() =>
			favoriteGroupsOf<TOrganizationProject, TFavoriteTask, IDocumentPage, IChatConversationWithState>({
				project: {
					ids: projectIds,
					items: isOrganizationProjectsLoaded ? organizationProjects : undefined,
					idOf: (project) => project.id,
					titleOf: (project) => project.name ?? '',
					hrefOf: (project) => `/projects/${project.id}`
				},
				task: {
					ids: taskIds,
					items: tasks,
					pendingIds: pendingTaskIds,
					idOf: (task) => task.id,
					titleOf: (task) => task.title,
					hrefOf: (task) => `/task/${task.id}`
				},
				...(showsDocuments && {
					document: {
						ids: documentIds,
						items: docsTree.isLoaded ? docsTree.pages : undefined,
						idOf: (page: IDocumentPage) => page.id,
						titleOf: (page: IDocumentPage) => page.name,
						hrefOf: (page: IDocumentPage) => `/docs/${encodeURIComponent(page.id)}`
					}
				}),
				...(chatOn && {
					chat: {
						ids: chatIds,
						items: chats.isLoading || chats.isError ? undefined : chats.conversations,
						idOf: (conversation: IChatConversationWithState) => String(conversation.id),
						titleOf: (conversation: IChatConversationWithState) =>
							conversationTitle(conversation, people.byEmployee, meEmployeeId, unnamed).replace(/^#/, ''),
						hrefOf: (conversation: IChatConversationWithState) => `/chat/${conversation.id}`
					}
				})
			}),
		[
			chatIds,
			chatOn,
			chats.conversations,
			chats.isError,
			chats.isLoading,
			docsTree.isLoaded,
			docsTree.pages,
			documentIds,
			isOrganizationProjectsLoaded,
			meEmployeeId,
			organizationProjects,
			pendingTaskIds,
			people.byEmployee,
			projectIds,
			showsDocuments,
			taskIds,
			tasks,
			unnamed
		]
	);

	const favoriteCount =
		projectIds.size + taskIds.size + (showsDocuments ? documentIds.size : 0) + (chatOn ? chatIds.size : 0);
	const resolvedCount = groups.reduce((sum, group) => sum + group.entries.length, unavailable.length);
	const isSourceLoading =
		getOrganizationProjectsLoading || favoriteTasksQuery.isLoading || docsTree.isLoading || chats.isLoading;

	// A request that failed is said so, with a retry: never shown as no favourites, nor as favourites that are gone
	const retries = [
		favoritesFailed && refetchFavorites,
		projectIds.size > 0 && isOrganizationProjectsError && refetchOrganizationProjects,
		missingTaskIds.length > 0 && favoriteTasksQuery.isError && favoriteTasksQuery.refetch,
		showsDocuments && documentIds.size > 0 && docsTree.isError && docsTree.retry,
		hasChatFavorites && chats.isError && chats.retry
	].filter((retry): retry is () => unknown => typeof retry === 'function');
	const retry = () => {
		for (const run of retries) {
			void run();
		}
	};

	return {
		groups: groups as FavoriteGroup<FavoriteItemEntry>[],
		unavailable: unavailable as UnavailableFavorite[],
		/** The person's favourites have arrived and there are none (of the kinds shown). */
		isEmpty: areFavoritesLoaded && favoriteCount === 0,
		/** The favourites, or the items of some of them, are still on their way. */
		isLoading: (!areFavoritesLoaded && !favoritesFailed) || (resolvedCount < favoriteCount && isSourceLoading),
		/** The favourites, or the items of a kind of them, could not be read. */
		isError: retries.length > 0,
		retry
	};
}
