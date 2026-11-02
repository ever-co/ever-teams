import * as React from 'react';
import { Transition } from '@headlessui/react';
import { useAtomValue } from 'jotai';
import { blockViewSearchQueryState, taskBlockFilterState } from '@/core/stores/tasks/task-filter';
import { cn } from '@/core/lib/helpers';
import { UserTeamCardSkeleton } from './team-members-header';
import { useTranslations } from 'next-intl';
import { UserTeamBlock } from './user-team-block';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Search, Users } from '@/core/components/icons';

interface Props {
	teamMembers: TOrganizationTeamEmployee[];
	publicTeam: boolean;
	teamsFetching: boolean;
}

const BLOCK_GRID_CLASS_NAME = 'grid w-full gap-3';

const BLOCK_GRID_COLUMNS_CLASS_NAME = 'lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4';

// Blocks need ~320px each; the AI chat panel takes part of the width, so add columns later while it is open.

/**
 * A search with no match says so and how to get results back; a status tab with nobody in it says who is missing.
 */
function emptyStateCopyOf({
	isSearching,
	filterEmptyMessage,
	t
}: {
	isSearching: boolean;
	filterEmptyMessage: string | undefined;
	t: ReturnType<typeof useTranslations>;
}) {
	const noMembersTitle = t('common.NO_TEAM_MEMBERS_FOUND');
	const adjustMessage = t('common.NO_TEAM_MEMBERS_FOUND_MESSAGE');
	if (isSearching) {
		return { title: noMembersTitle, message: adjustMessage, icon: <Search /> };
	}
	if (filterEmptyMessage) {
		return { title: filterEmptyMessage, message: null, icon: <Users /> };
	}
	return { title: noMembersTitle, message: null, icon: <Users /> };
}

const TeamMembersBlockView: React.FC<Props> = React.memo(
	({ teamMembers: members, publicTeam = false, teamsFetching }) => {
		const activeFilter = useAtomValue(taskBlockFilterState);
		const searchQuery = useAtomValue(blockViewSearchQueryState);
		const t = useTranslations();
		const objectEmptyMessage = React.useMemo(
			() => ({
				online: t('common.NO_USERS_ONLINE'),
				running: t('common.NO_USERS_WORKING'),
				pause: t('common.NO_USERS_PAUSED_WORK'),
				idle: t('common.NO_USERS_IDLE')
			}),
			[t]
		);
		const filterEmptyMessage = objectEmptyMessage[activeFilter as keyof typeof objectEmptyMessage];
		const hasNoMembers = members.length < 1 && !teamsFetching;
		const isSearching = searchQuery.trim().length > 0;

		return (
			<div className="flex flex-col gap-3">
				{/* Current user is now included in the filtered members list */}
				<div className={cn(BLOCK_GRID_CLASS_NAME, BLOCK_GRID_COLUMNS_CLASS_NAME)}>
					{members.map((member) => {
						return (
							<Transition
								as="div"
								key={member.id}
								show={true}
								enter="transition-opacity duration-75"
								enterFrom="opacity-0"
								enterTo="opacity-100"
								leave="transition-opacity duration-150"
								leaveFrom="opacity-100"
								leaveTo="opacity-0"
							>
								<UserTeamBlock member={member} publicTeam={publicTeam} />
							</Transition>
						);
					})}
				</div>
				<Transition
					as="ul"
					show={teamsFetching}
					enter="transition-opacity duration-75"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="transition-opacity duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
					className="flex flex-col gap-3"
				>
					{[1, 2].map((_, i) => {
						return (
							<li
								key={i}
								className="rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5"
							>
								<UserTeamCardSkeleton />
							</li>
						);
					})}
				</Transition>
				{hasNoMembers && (
					<AnimatedEmptyState
						{...emptyStateCopyOf({ isSearching, filterEmptyMessage, t })}
						minHeight="240px"
						className="shadow-sm shadow-black/6.5"
					/>
				)}
			</div>
		);
	}
);

export default TeamMembersBlockView;
