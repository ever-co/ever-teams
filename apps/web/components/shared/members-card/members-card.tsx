import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import DropdownUser from '@components/shared/members-card/components/users-card-menu';
import useAuthenticateUser from '@app/hooks/features/useAuthenticateUser';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import { ITeamTask } from '@app/interfaces/ITask';
import { secondsToTime } from '@app/helpers/date';
import { useOutsideClick } from '@app/hooks/useOutsideClick';
import { mergeRefs } from '@app/helpers/merge-refs';
import Separator from '@components/ui/separator';
import { WorkedOnTask } from './components/worked-on-task';
import { Worked24Hours } from './components/worked-24-hours';
import { MemberInfo } from './components/member-info';
import { IMember, MC_EditableValues } from './types';
import { TaskInfo } from './components/task-info';
import { EstimateTimeInfo } from './components/estimate-time';

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
	const [estimateEditMode, setEstimateEditMode] = useState(false);

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
			setEstimateEditMode(false);
			return;
		}

		const { h: estimateHours, m: estimateMinutes } = secondsToTime(
			memberTask.estimate || 0
		);

		if (hours === estimateHours && minutes === estimateMinutes) {
			setEstimateEditMode(false);
			return;
		}

		blurEstimationFields();

		await updateTask({
			...memberTask,
			estimateHours: hours,
			estimateMinutes: minutes,
			estimate: hours * 60 * 60 + minutes * 60, // time seconds
		});

		setEstimateEditMode(false);
	}, [memberTask, formValues, updateTask, blurEstimationFields]);

	/**
	 *  On click outside estimation inputs
	 */
	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLDivElement>(() => {
		if (!updateLoading) {
			handleEstimateSubmit();
		}
	});

	/**
	 * On click outside task edit
	 */
	const { targetEl: editTaskInputEl, ignoreElementRef: ignoreElementTaskIRef } =
		useOutsideClick<HTMLInputElement>(() => {
			setEstimateEditMode(false);
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
			} bg-[#FFFFFF] my-[15px] dark:bg-[#202023] flex justify-between text-primary dark:hover:border-gray-100 font-bold py-[24px] dark:text-[#FFFFFF]`}
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
			<EstimateTimeInfo
				ref={targetEl}
				clickIgnoreEl={ignoreElementRef}
				editable={formValues}
				hasEditMode={hasEditMode}
				editMode={estimateEditMode}
				setEditMode={setEstimateEditMode}
				memberTask={memberTask}
				loading={updateLoading}
				onChangeEstimate={onChangeEstimate}
				onSubmitEstimation={handleEstimateSubmit}
				isAuthUser={isAuthUser}
			/>
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
							setEstimateEdit={() => hasEditMode && setEstimateEditMode(true)}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default Card;
