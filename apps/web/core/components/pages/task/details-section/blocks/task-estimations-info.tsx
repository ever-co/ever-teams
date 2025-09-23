import { activeTeamState, detailedTaskState } from '@/core/stores';
import {
	Disclosure,
	DisclosureButton,
	DisclosurePanel,
	Popover,
	PopoverButton,
	PopoverPanel,
	Transition
} from '@headlessui/react';
import { ChevronDownIcon, ChevronUpIcon } from 'assets/svg';
import { useAtom, useAtomValue } from 'jotai';
import ProfileInfoWithTime from '../components/profile-info-with-time';
import TaskRow from '../components/task-row';
import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TaskEstimate } from '@/core/components/tasks/task-estimate';
import { Plus } from 'lucide-react';

const TaskEstimationsInfo = () => {
	const [task] = useAtom(detailedTaskState);
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);

	const teamMembers = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	return (
		<section className="flex flex-col gap-4 p-[0.9375rem]">
			<TaskRow
				labelTitle={t('pages.taskDetails.ESTIMATIONS')}
				// TODO
				// Commented icon temporary, will be enable it in future once dynamic implementation done
				// afterIconPath="/assets/svg/estimations.svg"
			>
				<Disclosure>
					{({ open }) => (
						<div className="flex flex-col w-full mt-[0.125rem]">
							<DisclosureButton className="flex items-center justify-between w-full">
								<TaskEstimate
									_task={task}
									className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white"
									wrapperClassName="w-4"
								/>

								{open ? (
									<ChevronUpIcon className="text-[#292D32] dark:text-white w-4 h-4" />
								) : (
									<ChevronDownIcon className="text-[#292D32] dark:text-white w-4 h-4" />
								)}
							</DisclosureButton>
							<DisclosurePanel>
								<div className="flex flex-col gap-[0.5625rem] mt-2">
									{task?.estimations?.map((estimation) => {
										return (
											<React.Fragment key={estimation.id}>
												<ProfileInfoWithTime
													key={estimation.id}
													profilePicSrc={
														teamMembers.find(
															(member) => member.id === estimation.employeeId
														)?.employee?.user?.imageUrl
													}
													names={
														teamMembers.find(
															(member) => member.id === estimation.employeeId
														)?.employee?.fullName ?? ''
													}
													userId={
														teamMembers.find(
															(member) => member.id === estimation.employeeId
														)?.employee?.userId
													}
													//@ts-ignore
													time={
														<TaskEstimate
															_task={task}
															className="not-italic font-medium text-[0.625rem] 3xl:text-xs !text-[#938FA3] dark:text-white"
															wrapperClassName="w-4"
														/>
													}
												/>
											</React.Fragment>
										);
									})}
								</div>
								<Popover>
									<PopoverButton className="flex items-center border text-xs rounded gap-x-2 p-2">
										<Plus className="w-3 h-3" />
										<p>Add new member</p>
									</PopoverButton>
									<Transition
										as="div"
										enter="transition ease-out duration-200"
										enterFrom="opacity-0 translate-y-1"
										enterTo="opacity-100 translate-y-0"
										leave="transition ease-in duration-150"
										leaveFrom="opacity-100 translate-y-0"
										leaveTo="opacity-0 translate-y-1"
									>
										<PopoverPanel anchor="bottom" className="z-20 h-60 w-60 p-3 bg-red-600">
											<div className=""></div>
										</PopoverPanel>
									</Transition>
								</Popover>
							</DisclosurePanel>
						</div>
					)}
				</Disclosure>
			</TaskRow>
		</section>
	);
};

export default TaskEstimationsInfo;
