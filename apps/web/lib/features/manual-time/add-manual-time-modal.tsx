/* eslint-disable @typescript-eslint/no-unused-vars */
import '../../../styles/style.css';
import { useOrganizationTeams, useTeamTasks } from '@app/hooks';
import { clsxm } from '@app/utils';
import { DatePicker } from '@components/ui/DatePicker';
import { format } from 'date-fns';
import { useState, useEffect, FormEvent, useCallback } from 'react';
import { Button, SelectItems, Modal } from 'lib/components';
import { manualTimeReasons } from '@app/constants';
import { useTranslations } from 'next-intl';
import { IOrganizationTeamList } from '@app/interfaces';
import { useManualTime } from '@app/hooks/features/useManualTime';
import { IAddManualTimeRequest } from '@app/interfaces/timer/ITimerLogs';
import { cn } from 'lib/utils';
import { CalendarIcon } from 'lucide-react';
import { IoTime } from 'react-icons/io5';

/**
 * Interface for the properties of the `AddManualTimeModal` component.
 *
 * This interface defines the properties expected by the `AddManualTimeModal` component.
 *
 * @interface IAddManualTimeModalProps
 *
 * @property {boolean} isOpen - Indicates whether the modal is open or closed.
 * @property {"Calendar" | "DailyPlan"} params - Determines the context in which the modal is used, either "Calendar" for the calendar view or "DailyPlan" for the daily plan.
 * @property {() => void} closeModal - Callback function to be called to close the modal.
 */
interface IAddManualTimeModalProps {
	isOpen: boolean;
	params: "AddManuelTime" | "AddTime";
	closeModal: () => void;
}

export function AddManualTimeModal(props: IAddManualTimeModalProps) {
	const { closeModal, isOpen, params } = props;
	const t = useTranslations();
	const [isBillable, setIsBillable] = useState<boolean>(false);
	const [description, setDescription] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [errorMsg, setErrorMsg] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [date, setDate] = useState<Date>(new Date());
	const [startTime, setStartTime] = useState<string>('');
	const [team, setTeam] = useState<IOrganizationTeamList>();
	const [taskId, setTaskId] = useState<string>('');
	const [timeDifference, setTimeDifference] = useState<string>('');
	const { activeTeamTask, tasks, activeTeam } = useTeamTasks();
	const { teams } = useOrganizationTeams();

	const { addManualTime, addManualTimeLoading, timeLog } = useManualTime();

	useEffect(() => {
		const now = new Date();
		const currentTime = now.toTimeString().slice(0, 5);

		setDate(now);
		setStartTime(currentTime);
		setEndTime(currentTime);
	}, []);

	const handleSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			const startedAt = new Date(date);
			const stoppedAt = new Date(date);

			// Set time for the started date
			startedAt.setHours(parseInt(startTime.split(':')[0]));
			startedAt.setMinutes(parseInt(startTime.split(':')[1]));

			// Set time for the stopped date
			stoppedAt.setHours(parseInt(endTime.split(':')[0]));
			stoppedAt.setMinutes(parseInt(endTime.split(':')[1]));

			const requestData: Omit<IAddManualTimeRequest, 'tenantId' | 'employeeId' | 'logType' | 'source'> = {
				startedAt,
				stoppedAt,
				taskId,
				description,
				reason,
				isBillable,
				organizationId: team?.organizationId
			};

			if (date && startTime && endTime && team && taskId) {
				if (endTime > startTime) {
					addManualTime(requestData); // [TODO : api] Allow team member to add manual time as well
				} else {
					setErrorMsg('End time should be after than start time');
				}
			} else {
				setErrorMsg("Please complete all required fields with a '*'");
			}
		},
		[addManualTime, date, description, endTime, isBillable, reason, startTime, taskId, team]
	);

	const calculateTimeDifference = useCallback(() => {
		const [startHours, startMinutes] = startTime.split(':').map(Number);
		const [endHours, endMinutes] = endTime.split(':').map(Number);

		const startTotalMinutes = startHours * 60 + startMinutes;
		const endTotalMinutes = endHours * 60 + endMinutes;

		const diffMinutes = endTotalMinutes - startTotalMinutes;
		if (diffMinutes < 0) return;

		const hours = Math.floor(diffMinutes / 60);
		const minutes = diffMinutes % 60;

		const timeString = [
			hours > 0 ? `${String(hours).padStart(2, '0')}h` : '0h',
			minutes > 0 ? `${String(minutes).padStart(2, '0')}m` : ''
		].filter(Boolean).join(' ');

		setTimeDifference(timeString);
	}, [endTime, startTime]);


	useEffect(() => {
		calculateTimeDifference();
	}, [calculateTimeDifference, endTime, startTime]);

	useEffect(() => {
		if (activeTeamTask) {
			setTaskId(activeTeamTask.id);
		}
		if (activeTeam) {
			setTeam(activeTeam);
		}
	}, [activeTeamTask, activeTeam]);

	useEffect(() => {
		if (!addManualTimeLoading && timeLog) {
			closeModal();
			setDescription('');
			setErrorMsg('');
		}
	}, [addManualTimeLoading, closeModal, timeLog]);

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			title={"Add Time"}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start shadow-xl"
			titleClass="font-bold"
		>
			<form onSubmit={handleSubmit} className="text-sm w-[90%] md:w-full  flex flex-col justify-between gap-4">
				<div className="flex flex-col">
					<label className="block text-gray-500 mb-1">
						Date<span className="text-[#de5505e1] ml-1">*</span>
					</label>
					<DatePicker
						buttonVariant={'link'}
						className="dark:bg-dark--theme-light"
						buttonClassName={'decoration-transparent  w-full flex items-center w-full border-gray-300 justify-start text-left font-normal text-black  h-10 border  dark:border-slate-600 rounded-md"'}
						customInput={
							<>
								<CalendarIcon className="h-4 w-4" />
								<Button
									variant={"outline"}
									className={cn(
										"w-full justify-start text-left font-normal text-black  h-10 border border-transparent",
										!date && "text-muted-foreground"
									)}>
									{date ? format(date, "PPP") : <span>Pick a date</span>}
								</Button>
							</>
						}
						selected={date}
						onSelect={(value) => {
							value && setDate(value);
						}}
						mode={'single'}
					/>
				</div>

				<div className=" flex items-center">
					<label className="block text-gray-500 mr-2">Billable</label>
					<div
						className={`w-12 h-6 flex items-center bg-[#6c57f4b7] rounded-full p-1 cursor-pointer `}
						onClick={() => setIsBillable(!isBillable)}
						style={
							isBillable
								? { background: 'linear-gradient(to right, #9d91efb7, #8a7bedb7)' }
								: { background: '#6c57f4b7' }
						}
					>
						<div
							className={` bg-[#3826A6] w-4 h-4 rounded-full shadow-md transform transition-transform ${isBillable ? 'translate-x-6' : 'translate-x-0'}`}
						/>
					</div>
				</div>
				<div className="flex items-center">
					<div className=" w-[48%] mr-[4%]">
						<label className="block text-gray-500 mb-1">
							Start time<span className="text-[#de5505e1] ml-1">*</span>
						</label>
						<input
							type="time"
							value={startTime}
							onChange={(e) => setStartTime(e.target.value)}
							className="w-full p-2 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
							required
						/>
					</div>

					<div className=" w-[48%]">
						<label className="block text-gray-500 mb-1">
							End time<span className="text-[#de5505e1] ml-1">*</span>
						</label>

						<input
							type="time"
							value={endTime}
							onChange={(e) => setEndTime(e.target.value)}
							className="w-full p-2 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
							required
						/>
					</div>
				</div>

				<div className=" flex items-center">
					<label className="block text-primary mb-1">{`${params === 'AddManuelTime' ? 'Total hours' : 'Added hours'}`}: </label>
					<div className="ml-[10px] p-1 flex items-center font-semibold dark:border-regal-rose  pr-3">
						<div className="mr-[10px] bg-gradient-to-tl text-[#3826A6]  rounded-full ">
							<IoTime
								size={20}
								className="rounded-full text-primary dark:text-[#8a7bedb7]"
							/>
						</div>
						{timeDifference}
					</div>
				</div>

				{
					params === 'AddManuelTime' ? (
						<>
							<div className="">
								<label className="block text-gray-500 mb-1">
									Project<span className="text-[#de5505e1] ml-1">*</span>
								</label>
								<SelectItems
									defaultValue={activeTeam!}
									items={teams}
									onValueChange={(team) => setTeam(team)}
									itemId={(team) => (team ? team.id : '')}
									itemToString={(team) => (team ? team.name : '')}
									triggerClassName="border-gray-300 dark:border-slate-600"
								/>
							</div>

							<div className="">
								<label className="block text-gray-500 mb-1">
									Employee<span className="text-[#de5505e1] ml-1">*</span>
								</label>
								<SelectItems
									defaultValue={activeTeamTask}
									items={tasks}
									onValueChange={(task) => setTaskId(task ? task.id : '')}
									itemId={(task) => (task ? task.id : '')}
									itemToString={(task) => (task ? task.title : '')}
									triggerClassName="border-gray-300 dark:border-slate-600"
								/>
							</div>

							<div className="">
								<label className="block text-gray-500 mb-1">
									Task<span className="text-[#de5505e1] ml-1">*</span>
								</label>
								<SelectItems
									items={manualTimeReasons.map((reason) => t(`manualTime.reasons.${reason}`))}
									onValueChange={(reason) => setReason(reason)}
									itemId={(reason) => reason}
									defaultValue={t('manualTime.reasons.DEFAULT')}
									itemToString={(reason) => reason}
									triggerClassName="border-gray-300 dark:border-slate-600"
								/>
							</div>
							<div className="flex flex-col">
								<label className="block text-gray-500 shrink-0">Description (optional)</label>
								<textarea
									value={description}
									placeholder="What did you worked on..."
									onChange={(e) => setDescription(e.target.value)}
									className="w-full resize-none p-2 grow border border-gray-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-32"
								/>
							</div>
						</>
					) : (
						<>
							<div className="">
								<label className="block text-gray-500 mb-1">
									Team<span className="text-[#de5505e1] ml-1">*</span>
								</label>
								<SelectItems
									defaultValue={activeTeam!}
									items={teams}
									onValueChange={(team) => setTeam(team)}
									itemId={(team) => (team ? team.id : '')}
									itemToString={(team) => (team ? team.name : '')}
									triggerClassName="border-gray-300 dark:border-slate-600"
								/>
							</div>

							<div className="">
								<label className="block text-gray-500 mb-1">
									Task<span className="text-[#de5505e1] ml-1">*</span>
								</label>
								<SelectItems
									defaultValue={activeTeamTask}
									items={tasks}
									onValueChange={(task) => setTaskId(task ? task.id : '')}
									itemId={(task) => (task ? task.id : '')}
									itemToString={(task) => (task ? task.title : '')}
									triggerClassName="border-gray-300 dark:border-slate-600"
								/>
							</div>

							<div className="flex flex-col">
								<label className="block text-gray-500 shrink-0">Description (optional)</label>
								<textarea
									value={description}
									placeholder="What worked on? "
									onChange={(e) => setDescription(e.target.value)}
									className="w-full resize-none p-2 grow border border-gray-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-32"
								/>
							</div>

							<div className="">
								<label className="block text-gray-500 mb-1">Reason (optional)</label>
								<SelectItems
									items={manualTimeReasons.map((reason) => t(`manualTime.reasons.${reason}`))}
									onValueChange={(reason) => setReason(reason)}
									itemId={(reason) => reason}
									defaultValue={t('manualTime.reasons.DEFAULT')}
									itemToString={(reason) => reason}
									triggerClassName="border-gray-300 dark:border-slate-600"
								/>
							</div>
						</>
					)

				}

				<div
					className={clsxm(
						"flex items-center w-full pt-2",
						params === 'AddManuelTime' ? "justify-center" : "justify-between"
					)}>
					<>
						{params === 'AddTime' && (
							<Button
								variant="outline"
								type="button"
								className="dark:text-primary border-gray-300 dark:border-slate-600 font-bold dark:bg-dark--theme-light"
							>
								View timesheet
							</Button>
						)}
						<Button
							loading={addManualTimeLoading}
							disabled={addManualTimeLoading}
							type="submit"
							className={clsxm(
								"bg-[#3826A6] font-bold flex items-center text-white",
								`${params === 'AddManuelTime' && "w-full"}`
							)}>
							Add Time
						</Button>
					</>
				</div>
				{
					errorMsg && (
						<div className="m-2 text-[#ff6a00de]">{errorMsg}</div>
					)
				}
			</form>
		</Modal >
	);
}
