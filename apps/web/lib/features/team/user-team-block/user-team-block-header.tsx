import React from 'react';
import { useOrganizationTeams, useAuthenticateUser, useModal, useUserProfilePage } from '@app/hooks';
import { clsxm } from '@app/utils';
import { InviteFormModal } from '../invite/invite-form-modal';
import { taskBlockFilterState } from '@app/stores/task-filter';
import {
	PauseIcon,
	SearchNormalIcon,
	TimerPlayIcon,
	StopCircleIcon,
	NotWorkingIcon,
	OnlineIcon
} from 'lib/components/svgs';
import { Transition } from '@headlessui/react';
import { Button, VerticalSeparator } from 'lib/components';
import { useTaskFilter, TaskNameFilter } from 'lib/features';
import { useRecoilState } from 'recoil';

interface IFilter {
	running: number;
	online: number;
	pause: number;
	idle: number;
	suspended: number;
}

export function UserTeamBlockHeader() {
	// const { t } = useTranslation();
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();
	const [activeFilter, setActiveFilter] = useRecoilState<
		'all' | 'running' | 'online' | 'pause' | 'idle' | 'suspended'
	>(taskBlockFilterState);

	const profile = useUserProfilePage();
	const hook = useTaskFilter(profile);

	const membersStatusNumber: IFilter = {
		running: 0,
		online: 0,
		pause: 0,
		idle: 0,
		suspended: 0
	};

	const members = activeTeam?.members ? activeTeam?.members : [];
	members?.map((item) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		membersStatusNumber[item.timerStatus!]++;
	});

	return (
		<>
			<div className="hidden sm:flex row font-normal pt-4 justify-between hidde dark:text-[#7B8089]">
				<div className="flex items-center w-3/4">
					<div
						className={clsxm(
							'w-1/6 text-center flex items-center justify-center gap-3 py-4 cursor-pointer',
							activeFilter == 'all' &&
								'border-b-4 border-primary dark:border-white  text-primary dark:text-white'
						)}
						onClick={() => setActiveFilter('all')}
					>
						<StopCircleIcon
							className={clsxm(
								'w-8 h-8 p-1 !text-gray-300 !fill-gray-400 dark:!text-white',
								activeFilter == 'all' &&
									'!text-primary !fill-primary  dark:!text-white dark:!fill-white'
							)}
						/>
						<p>All members </p>
						<span
							className={clsxm(
								' bg-gray-600/50 p-1 px-2 text-xs rounded-md',
								activeFilter == 'all' && 'bg-primary dark:bg-[#47484D] text-white'
							)}
						>
							{members?.length}
						</span>
					</div>
					<div
						className={clsxm(
							'w-1/6 text-center flex items-center justify-center gap-3 py-4 cursor-pointer',
							activeFilter == 'idle' &&
								'border-b-4 border-primary dark:border-white  text-primary dark:text-white'
						)}
						onClick={() => setActiveFilter('idle')}
					>
						<NotWorkingIcon
							className={clsxm(
								'w-8 h-8 p-1 !text-gray-300 !fill-gray-400 dark:!text-white',
								activeFilter == 'idle' &&
									'!text-primary !fill-primary  dark:!text-white dark:!fill-white'
							)}
						/>
						<p>Not working </p>
						<span
							className={clsxm(
								' bg-gray-600/50 p-1 px-2 text-xs rounded-md',
								activeFilter == 'idle' && 'bg-primary dark:bg-[#47484D] text-white'
							)}
						>
							{membersStatusNumber.idle}
						</span>
					</div>
					<div
						className={clsxm(
							'w-1/6 text-center flex items-center justify-center gap-3 py-4 cursor-pointer',
							activeFilter == 'running' &&
								'border-b-4 border-primary dark:border-white  text-primary dark:text-white'
						)}
						onClick={() => setActiveFilter('running')}
					>
						<TimerPlayIcon
							className={clsxm(
								'w-8 h-8 p-1 !text-gray-300 !fill-gray-400 dark:!text-white',
								activeFilter == 'running' &&
									'!text-primary !fill-primary  dark:!text-white dark:!fill-white'
							)}
						/>
						<p>Working </p>
						<span
							className={clsxm(
								' bg-gray-600/50 p-1 px-2 text-xs rounded-md',
								activeFilter == 'running' && 'bg-primary dark:bg-[#47484D] text-white'
							)}
						>
							{membersStatusNumber.running}
						</span>
					</div>
					<div
						className={clsxm(
							'w-1/6 text-center flex items-center justify-center gap-3 py-4 cursor-pointer',
							activeFilter == 'pause' &&
								'border-b-4 border-primary dark:border-white  text-primary dark:text-white'
						)}
						onClick={() => setActiveFilter('pause')}
					>
						<PauseIcon
							className={clsxm(
								'w-8 h-8 p-1 !text-gray-300 !fill-gray-400 dark:!text-white',
								activeFilter == 'pause' &&
									'!text-primary !fill-primary  dark:!text-white dark:!fill-white'
							)}
						/>
						<p>Paused </p>
						<span
							className={clsxm(
								' bg-gray-600/50 p-1 px-2 text-xs rounded-md',
								activeFilter == 'pause' && 'bg-primary dark:bg-[#47484D] text-white'
							)}
						>
							{membersStatusNumber.pause}
						</span>
					</div>
					<div
						className={clsxm(
							'w-1/6 text-center flex items-center justify-center gap-3 py-4 cursor-pointer',
							activeFilter == 'online' &&
								'border-b-4 border-primary dark:border-white  text-primary dark:text-white'
						)}
						onClick={() => setActiveFilter('online')}
					>
						<OnlineIcon
							className={clsxm(
								'w-8 h-8 p-1 !text-gray-300 !fill-gray-400 dark:!text-white',
								activeFilter == 'online' &&
									'!text-primary !fill-primary  dark:!text-white dark:!fill-white'
							)}
						/>
						<p>Online</p>
						<span
							className={clsxm(
								' bg-gray-600/50 p-1 px-2 text-xs rounded-md',
								activeFilter == 'online' && 'bg-primary dark:bg-[#47484D] text-white'
							)}
						>
							{membersStatusNumber.online}
						</span>
					</div>
				</div>
				<div className="w-1/4 flex justify-end gap-2	items-center">
					{/* <Invite /> */}
					<button
						ref={hook.outclickFilterCard.ignoreElementRef}
						className={clsxm('outline-none')}
						onClick={() => hook.toggleFilterType('search')}
					>
						<SearchNormalIcon
							className={clsxm(
								'dark:stroke-white',
								hook.filterType === 'search' && ['stroke-primary-light dark:stroke-primary-light']
							)}
						/>
					</button>

					<VerticalSeparator />

					<Button className="py-3.5 px-4 gap-3 rounded-xl outline-none" onClick={openModal}>
						Invite
					</Button>
				</div>
			</div>
			<div className="hidden sm:flex w-1/2 row font-normal  justify-end hidde dark:text-[#7B8089]">
				<Transition
					show={hook.filterType !== undefined}
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0 ease-out"
					// className="pb-3"
					ref={hook.outclickFilterCard.targetEl}
				>
					{hook.filterType === 'search' && (
						<TaskNameFilter
							fullWidth={true}
							value={hook.taskName}
							setValue={hook.setTaskName}
							close={() => {
								hook.toggleFilterType('search');
							}}
						/>
					)}
				</Transition>
			</div>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
}
