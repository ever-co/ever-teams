import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Image from 'next/legacy/image';
import DropdownUser from '@components/shared/members-card/components/users-card-menu';
import { TimeInput } from '@components/ui/inputs/time-input';
import useAuthenticateUser from '@app/hooks/features/useAuthenticateUser';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import { ITeamTask } from '@app/interfaces/ITask';
import { secondsToTime } from '@app/helpers/date';
import { pad } from '@app/helpers/number';
import { useOutsideClick } from '@app/hooks/useOutsideClick';
import { mergeRefs } from '@app/helpers/merge-refs';
import Separator from '@components/ui/separator';
import { EstimationProgress } from './components/estimation-progress';
import { WorkedOnTask } from './components/worked-on-task';
import { Worked24Hours } from './components/worked-24-hours';
import { MemberInfo } from './components/member-info';
import { IMember, MC_EditableValues } from './types';
import { Spinner } from '@components/ui/loaders/spinner';
import { TaskInfo } from './components/task-info';

const Card = ({ member }: { member: IMember }) => {
	const { isTeamManager, user } = useAuthenticateUser();
	const { activeTeamTask, updateTask, updateLoading } = useTeamTasks();
	const isAuthUser = member.employee.userId === user?.id;
	const isManager = isAuthUser && isTeamManager;
	const iuser = member.employee.user;

	const [memberTask, setMemberTask] = useState<ITeamTask | null>(null);

	// Can edit hooks
	const hasEditMode = isManager || isAuthUser;
	const [taskEditMode, setTaskEditMode] = useState(false);
	const [estimateEdit, setEstimateEdit] = useState(false);

	const [formValues, setFormValues] = useState<MC_EditableValues>({
		memberName: `${iuser?.firstName} ${iuser?.lastName || ''}`,
		memberTask: '',
		estimateHours: 0,
		estimateMinutes: 0,
	});

	useEffect(() => {
		if (isAuthUser) {
			setMemberTask(activeTeamTask);
		}
	}, [activeTeamTask, isAuthUser]);

	useEffect(() => {
		if (memberTask) {
			const { m, h } = secondsToTime(memberTask.estimate || 0);
			setFormValues((d) => {
				return {
					...d,
					memberTask: memberTask.title,
					estimateHours: h,
					estimateMinutes: m,
				};
			});
		}
	}, [memberTask]);

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormValues((prevState) => ({ ...prevState, [name]: value }));
	};

	const onChangeEstimate = useCallback((c: keyof typeof formValues) => {
		return (e: ChangeEvent<HTMLInputElement>) => {
			const tm = +e.currentTarget.value.trim();
			const isInteger = !isNaN(tm) && Number.isInteger(tm);

			switch (c) {
				case 'estimateHours':
					if (!isInteger || tm < 0 || tm > 999) {
						return;
					}
					break;
				case 'estimateMinutes':
					if (!isInteger || tm < 0 || tm > 60) {
						return;
					}
					break;
				default:
					return;
			}

			setFormValues((vls) => {
				return {
					...vls,
					[c]: tm,
				};
			});
		};
	}, []);

	const canEditEstimate = useCallback(() => {
		(isManager || isAuthUser) && setEstimateEdit(true);
	}, [isAuthUser, isManager]);

	const handleTaskEdit = async () => {
		if (memberTask && memberTask.title !== formValues.memberTask) {
			await updateTask({
				...memberTask,
				title: formValues.memberTask,
			});
		}
		setTaskEditMode(false);
	};

	const blurEstimationFields = useCallback(() => {
		document.querySelector<HTMLInputElement>('[name=estimateHours]')?.blur();
		document.querySelector<HTMLInputElement>('[name=estimateMinutes]')?.blur();
	}, []);

	const handleEstimateSubmit = useCallback(async () => {
		if (!memberTask) return;

		const hours = +formValues['estimateHours'];
		const minutes = +formValues['estimateMinutes'];
		if (isNaN(hours) || isNaN(minutes)) {
			setEstimateEdit(false);
			return;
		}

		const { h: estimateHours, m: estimateMinutes } = secondsToTime(
			memberTask.estimate || 0
		);

		if (hours === estimateHours && minutes === estimateMinutes) {
			setEstimateEdit(false);
			return;
		}

		blurEstimationFields();

		await updateTask({
			...memberTask,
			estimateHours: hours,
			estimateMinutes: minutes,
			estimate: hours * 60 * 60 + minutes * 60, // time seconds
		});

		setEstimateEdit(false);
	}, [memberTask, formValues, updateTask, blurEstimationFields]);

	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLDivElement>(() => {
		if (!updateLoading) {
			handleEstimateSubmit();
		}
	});

	const { targetEl: editTaskInputEl, ignoreElementRef: ignoreElementTaskIRef } =
		useOutsideClick<HTMLInputElement>(() => {
			setEstimateEdit(false);
			if (!updateLoading) {
				handleTaskEdit();
			}
		});

	return (
		<div
			className={`w-full rounded-[15px] border ${
				isManager
					? ' border-primary dark:border-gray-100'
					: ' hover:border hover:border-primary dark:border-[#202023]'
			} bg-[#FFFFFF] my-[15px] dark:bg-[#202023] flex
    justify-between text-primary dark:hover:border-gray-100
    font-bold py-[24px] dark:text-[#FFFFFF]`}
		>
			<div className="w-[60px]  flex justify-center items-center">
				<div className={`rounded-[50%] w-5 h-5 bg-[#02b102]`}></div>
			</div>

			{/* User info */}
			<MemberInfo
				member={iuser}
				editMode={false}
				editable={formValues}
				onChangeName={handleChange}
			/>
			<Separator />

			{/* Task info */}
			<TaskInfo
				memberTask={memberTask}
				editMode={taskEditMode}
				setEditMode={setTaskEditMode}
				editable={formValues}
				hasEditMode={hasEditMode}
				onChangeName={handleChange}
				onSubmitName={handleTaskEdit}
				loading={updateLoading}
				ref={editTaskInputEl}
			/>
			<Separator />

			{/* Time worked on task */}
			<WorkedOnTask memberTask={memberTask} isAuthUser={isAuthUser} />
			<Separator />

			{/* Estimate time */}
			<div className="w-[245px]  flex justify-center items-center">
				<div>
					<EstimationProgress memberTask={memberTask} isAuthUser={isAuthUser} />
					<div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex items-center justify-center">
						{!estimateEdit && (
							<div className="flex items-center">
								<div>
									Estimate : {formValues.estimateHours}h{' '}
									{pad(formValues.estimateMinutes)}m
								</div>
								<span
									className="ml-[15px] flex items-center cursor-pointer"
									onClick={canEditEstimate}
									ref={ignoreElementRef}
								>
									<Image
										src="/assets/png/edit.png"
										width={20}
										height={20}
										alt="edit icon"
									/>
								</span>
							</div>
						)}
						{estimateEdit && (
							<div className="flex items-center justify-center">
								<div
									className="bg-[#F2F4FB] dark:bg-[#18181B] flex"
									ref={targetEl}
								>
									<TimeInput
										value={'' + formValues.estimateHours}
										type="string"
										placeholder="h"
										name="estimateHours"
										handleChange={onChangeEstimate('estimateHours')}
										handleDoubleClick={canEditEstimate}
										handleEnter={handleEstimateSubmit}
										style={`w-[30px] h-[30px] pt-1 bg-transparent`}
										disabled={!estimateEdit}
									/>
									<div className="mr-2 h-[30px] flex items-end text-[14px] border-b-2 dark:border-[#616164] border-dashed">
										h
									</div>
									<div className="flex items-center">:</div>
									<TimeInput
										value={'' + formValues.estimateMinutes}
										type="string"
										placeholder="m"
										name="estimateMinutes"
										handleChange={onChangeEstimate('estimateMinutes')}
										handleDoubleClick={canEditEstimate}
										handleEnter={handleEstimateSubmit}
										style={`w-[30px] bg-transparent h-[30px] pt-1`}
										disabled={!estimateEdit}
									/>
									<div className="mr-2 h-[30px] flex items-end text-[14px] border-b-2 dark:border-[#616164] border-dashed">
										m
									</div>
								</div>{' '}
								<span className="w-3 h-5 ml-2">
									{updateLoading && <Spinner dark={false} />}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
			<Separator />

			{/* Time worked on 24 hours */}
			<div className="w-[184px]  flex items-center">
				<Worked24Hours isAuthUser={isAuthUser} />
				{isTeamManager && (
					<div
						className="mr-[20px]"
						ref={mergeRefs([ignoreElementRef, ignoreElementTaskIRef])}
					>
						<DropdownUser
							member={member}
							setEdit={() => hasEditMode && setTaskEditMode(true)}
							setEstimateEdit={canEditEstimate}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default Card;
