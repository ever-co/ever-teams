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
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TaskEstimate } from '@/core/components/tasks/task-estimate';
import { CheckIcon, LoaderIcon, Plus } from 'lucide-react';
import {
	Select,
	Thumbnail
} from '@/core/components/features/projects/add-or-edit-project/steps/basic-information-form';
import { cn } from '@/core/lib/helpers';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TimeInputField } from '@/core/components/duplicated-components/_input';
import { Card } from '@/core/components/duplicated-components/card';
import { Button } from '@/core/components/common/button';
import { useTaskEstimations } from '@/core/hooks/tasks/use-task-estimations';
import { TTask } from '@/core/types/schemas/task/task.schema';

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
								{task ? (
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
											<PopoverPanel anchor="bottom" className="z-20">
												<AddNewMemberEstimation task={task} />
											</PopoverPanel>
										</Transition>
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

function AddNewMemberEstimation({ task }: { task: TTask }) {
	const [selectedMember, setSelectedMember] = useState<TOrganizationTeamEmployee | null>(null);
	const activeTeam = useAtomValue(activeTeamState);
	const teamMembers = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);

	const { addEstimationMutation, addEstimationLoading } = useTaskEstimations();

	const handleAddEstimation = useCallback(async () => {
		try {
			if (!selectedMember) return;
			await addEstimationMutation.mutateAsync({
				employeeId: selectedMember.id,
				estimate: 0,
				taskId: task.id
			});
		} catch (error) {
			console.error(error);
		}
	}, [addEstimationMutation, selectedMember, task.id]);

	return (
		<Card shadow="custom" className="!p-1">
			<div className="flex gap-4 shadow-md border p-4 items-center rounded-lg">
				<div className="w-60">
					<Select
						placeholder={'Select member'}
						selectTriggerClassName="w-full"
						options={teamMembers.map((member) => ({
							id: member.id,
							value: member.employee?.fullName || '',
							imgUrl: member.employee?.user?.imageUrl || ''
						}))}
						onChange={(memberId) => {
							const member = teamMembers.find((member) => member.id === memberId);
							setSelectedMember(member || null);
						}}
						selected={selectedMember?.id ?? null}
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
											selectedMember?.id && !isSelected && 'pl-[18px]'
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
					<TimeInputField label="Hours" />
					<TimeInputField label="Minutes" />
				</div>

				<Button className="px-8 h-10" onClick={handleAddEstimation} disabled={addEstimationLoading}>
					Add {addEstimationLoading && <LoaderIcon className="w-4 h-4 animate-spin" />}
				</Button>
			</div>
		</Card>
	);
}
