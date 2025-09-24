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
import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TaskEstimate } from '@/core/components/tasks/task-estimate';
import { CheckIcon, Plus } from 'lucide-react';
import {
	Select,
	Thumbnail
} from '@/core/components/features/projects/add-or-edit-project/steps/basic-information-form';
import { cn } from '@/core/lib/helpers';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { Card } from '@/core/components/duplicated-components/card';
import { TCreateTaskEstimation, TTask } from '@/core/types/schemas/task/task.schema';
import { TaskMemberEstimate } from '@/core/components/tasks/task-member-estimate';

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
							<DisclosurePanel className="space-y-2">
								<div className="flex flex-col gap-[0.5625rem] mt-2">
									{task?.estimations?.map((estimation) => {
										const member = teamMembers.find(
											(member) => member.employee.id === estimation.employeeId
										);

										return (
											<React.Fragment key={estimation.id}>
												<ProfileInfoWithTime
													key={estimation.id}
													profilePicSrc={member?.employee?.user?.imageUrl}
													names={member?.employee?.fullName ?? ''}
													userId={member?.employee?.userId}
													time={
														<TaskMemberEstimate
															taskEstimation={estimation}
															className="not-italic font-medium text-[0.625rem] 3xl:text-xs !text-[#938FA3] dark:text-white"
															wrapperClassName="w-4"
														/>
													}
												/>
											</React.Fragment>
										);
									})}
								</div>
								{task ? (
									<Popover>
										{({ close }) => (
											<>
												<PopoverButton className="flex justify-center items-center px-2 py-1 text-black rounded-full border border-gray-200 cursor-pointer dark:text-white">
													<Plus className="w-3 h-3" />
													<p className="font-semibold text-[0.625rem] leading-none">
														Add new member
													</p>
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
													<PopoverPanel anchor="bottom" className="z-20">
														<AddNewMemberEstimation onSuccess={close} task={task} />
													</PopoverPanel>
												</Transition>
											</>
										)}
									</Popover>
								) : null}
							</DisclosurePanel>
						</div>
					)}
				</Disclosure>
			</TaskRow>
		</section>
	);
};

export default TaskEstimationsInfo;

function AddNewMemberEstimation({ task, onSuccess }: { task: TTask; onSuccess?: () => void }) {
	const [selectedMember, setSelectedMember] = useState<TOrganizationTeamEmployee | null>(null);
	const activeTeam = useAtomValue(activeTeamState);
	const teamMembers = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const taskEstimation = useMemo<TCreateTaskEstimation>(
		() => ({
			employeeId: selectedMember?.employee.id || '',
			estimate: 0,
			taskId: task.id
		}),
		[selectedMember]
	);

	return (
		<Card shadow="custom" className="!p-1">
			<div className="flex gap-4 shadow-md border p-4 items-center rounded-lg">
				<div className="w-60">
					<Select
						placeholder={'Select member'}
						selectTriggerClassName="w-full"
						options={teamMembers.map((member) => ({
							id: member.employee.id,
							value: member.employee?.fullName || '',
							imgUrl: member.employee?.user?.imageUrl || ''
						}))}
						onChange={(memberId) => {
							const member = teamMembers.find((member) => member.employee.id === memberId);
							setSelectedMember(member || null);
						}}
						selected={selectedMember?.employee?.id ?? null}
						renderItem={(item, isSelected) => {
							return (
								<div
									className={cn(
										'w-full h-full p-1 px-2 flex items-center gap-2 rounded',
										isSelected && 'bg-primary text-primary-foreground dark:text-white'
									)}
								>
									{isSelected && <CheckIcon size={10} />}
									<span
										className={cn(
											'  flex items-center gap-2',
											selectedMember?.employee?.id && !isSelected && 'pl-[18px]'
										)}
									>
										<Thumbnail
											className="z-20 text-gray-700 bg-white rounded-full"
											imgUrl={item?.imgUrl}
											size={'20px'}
											identifier={String(item?.value)}
										/>
										<span className="capitalize">{item?.value ?? '-'}</span>
									</span>
								</div>
							);
						}}
					/>
				</div>

				<div className="flex gap-2 rounded px-2 ">
					<TaskMemberEstimate onSuccess={onSuccess} taskEstimation={taskEstimation} />
				</div>
			</div>
		</Card>
	);
}
