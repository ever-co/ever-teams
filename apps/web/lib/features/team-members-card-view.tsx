import { useAuthenticateUser, useDailyPlan, useModal, useOrganizationEmployeeTeams, useTeamInvitations, useUserProfilePage } from '@app/hooks';
import { Transition } from '@headlessui/react';
import { InviteFormModal } from './team/invite/invite-form-modal';
import { InvitedCard, InviteUserTeamCard } from './team/invite/user-invite-card';
import { InviteUserTeamSkeleton, UserTeamCard, UserTeamCardSkeleton } from '.';
import { OT_Member } from '@app/interfaces';
import React, { useEffect, useState } from 'react';
import { DailyPlanCompareEstimatedModal } from './daily-plan';
import { DAILY_PLAN_SHOW_MODAL } from '@app/constants';

interface Props {
	teamMembers: OT_Member[];
	publicTeam: boolean;
	currentUser: OT_Member | undefined;
	teamsFetching: boolean;
}

const TeamMembersCardView: React.FC<Props> = ({
	teamMembers: members,
	currentUser,
	teamsFetching = false,
	publicTeam = false
}) => {

	const { isTeamManager } = useAuthenticateUser();
	const { teamInvitations } = useTeamInvitations();
	const [isOpen, setIsOpen] = useState(false)
	const { todayPlan } = useDailyPlan();
	const profile = useUserProfilePage();
	const defaultOpenPopup =
		typeof window !== 'undefined'
			? (window.localStorage.getItem(DAILY_PLAN_SHOW_MODAL)) || null
			: new Date().toISOString().split('T')[0];
	const plan = todayPlan.find((plan) => plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]));

	const { updateOrganizationTeamEmployeeOrderOnList } = useOrganizationEmployeeTeams();

	// TODO: sort teamMembers by index
	const [memberOrdereds, setMemberOrdereds] = React.useState<OT_Member[]>(members);
	const dragTeamMember = React.useRef<number>(0);
	const draggedOverTeamMember = React.useRef<number>(0);

	useEffect(() => setMemberOrdereds(members), [members]);

	useEffect(() => {
		if (plan) {
			const currentDateString = new Date().toISOString().split('T')[0];
			window.localStorage.setItem(DAILY_PLAN_SHOW_MODAL, currentDateString);
			if (defaultOpenPopup !== currentDateString || !defaultOpenPopup) {
				setIsOpen(true);
			}
		}
	}, [defaultOpenPopup, plan]);



	function handleSort() {
		const peopleClone = [...memberOrdereds];
		const temp = peopleClone[dragTeamMember.current];
		peopleClone[dragTeamMember.current] = peopleClone[draggedOverTeamMember.current];
		peopleClone[draggedOverTeamMember.current] = temp;
		setMemberOrdereds(peopleClone);
		// TODO: update teamMembers index
		handleChangeOrder(peopleClone[dragTeamMember.current], draggedOverTeamMember.current);
		handleChangeOrder(peopleClone[draggedOverTeamMember.current], dragTeamMember.current);
	}

	const handleChangeOrder = (employee: OT_Member, order: number) => {
		updateOrganizationTeamEmployeeOrderOnList(employee, order);
	};

	return (
		<>
			<DailyPlanCompareEstimatedModal open={isOpen} closeModal={() => setIsOpen((prev) => {
				window.localStorage.setItem(DAILY_PLAN_SHOW_MODAL, new Date().toISOString().split('T')[0]);
				return !prev;
			})} todayPlan={todayPlan} profile={profile} />

			<ul className="mt-7">
				{/* Current authenticated user members */}
				<Transition
					show={!!currentUser}
					enter="transition-opacity duration-75"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="transition-opacity duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<li className="mb-4">
						<UserTeamCard
							member={currentUser}
							active
							publicTeam={publicTeam}
							draggable={true}
							currentExit={false}
							onDragStart={() => (dragTeamMember.current = 0)}
							onDragEnter={() => (draggedOverTeamMember.current = 0)}
							onDragEnd={handleSort}
							onDragOver={(e) => e.preventDefault()}
						/>
					</li>
				</Transition>

				{/* Team members list */}
				{memberOrdereds.map((member, i) => {
					return (
						<Transition
							key={member.id}
							show={true}
							enter="transition-opacity duration-75"
							enterFrom="opacity-0"
							enterTo="opacity-100"
							leave="transition-opacity duration-150"
							leaveFrom="opacity-100"
							leaveTo="opacity-0"
						>
							<li className="mb-4">
								<UserTeamCard
									member={member}
									publicTeam={publicTeam}
									currentExit={draggedOverTeamMember.current == i}
									draggable={isTeamManager}
									onDragStart={() => {
										dragTeamMember.current = i;
									}}
									onDragEnter={() => {
										draggedOverTeamMember.current = i;
									}}
									onDragEnd={handleSort}
									onDragOver={(e) => e.preventDefault()}
								/>
							</li>
						</Transition>
					);
				})}

				{members.length > 0 &&
					teamInvitations.map((invitation) => (
						<li key={invitation.id} className="mb-4">
							<InvitedCard invitation={invitation} />
						</li>
					))}

				{/* Loader skeleton */}
				<Transition
					show={teamsFetching}
					enter="transition-opacity duration-75"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="transition-opacity duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					{[0, 2].map((_, i) => {
						return (
							<li key={i} className="mt-3">
								<UserTeamCardSkeleton />
							</li>
						);
					})}
					<li>
						<InviteUserTeamSkeleton />
					</li>
				</Transition>

				{/* Invite button */}
				<Transition
					show={isTeamManager}
					enter="transition-opacity duration-75"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="transition-opacity duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<li className="mb-4">
						<Invite />
					</li>
				</Transition>
			</ul>
		</>
	);
};

function Invite() {
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();

	return (
		<>
			<InviteUserTeamCard active={user?.isEmailVerified} onClick={openModal} />
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
}

export default TeamMembersCardView;
