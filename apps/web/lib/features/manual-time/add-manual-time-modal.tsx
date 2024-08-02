/* eslint-disable @typescript-eslint/no-unused-vars */
import '../../../styles/style.css';
import { useOrganizationTeams, useTeamTasks } from '@app/hooks';
import { clsxm } from '@app/utils';
import { DatePicker } from '@components/ui/DatePicker';
import { PencilSquareIcon } from '@heroicons/react/20/solid';
import { format } from 'date-fns';
import { useState, useEffect, FormEvent, useCallback } from 'react';
import { Button, SelectItems, Modal } from 'lib/components';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { HiMiniClock } from 'react-icons/hi2';
import { manualTimeReasons } from '@app/constants';
import { useTranslations } from 'next-intl';
import { IOrganizationTeamList } from '@app/interfaces';
import { useManualTime } from '@app/hooks/features/useManualTime';
import { IAddManualTimeRequest } from '@app/interfaces/timer/ITimerLogs';

interface IAddManualTimeModalProps {
	isOpen: boolean;
	closeModal: () => void;
}

export function AddManualTimeModal(props: IAddManualTimeModalProps) {
	const { closeModal, isOpen } = props;
	const t = useTranslations();
	const [isBillable, setIsBillable] = useState<boolean>(false);
	const [description, setDescription] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [errorMsg] = useState<string>('');
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

			addManualTime(requestData); // [TODO : api] Allow team member to add manual time as well
		},
		[addManualTime, date, description, endTime, isBillable, reason, startTime, taskId, team?.organizationId]
	);

	const calculateTimeDifference = useCallback(() => {
		const [startHours, startMinutes] = startTime.split(':').map(Number);
		const [endHours, endMinutes] = endTime.split(':').map(Number);

		const startTotalMinutes = startHours * 60 + startMinutes;
		const endTotalMinutes = endHours * 60 + endMinutes;

		const diffMinutes = endTotalMinutes - startTotalMinutes;
		if (diffMinutes < 0) {
			return;
		}

		const hours = Math.floor(diffMinutes / 60);
		const minutes = diffMinutes % 60;
		setTimeDifference(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`);
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
		}
	}, [addManualTimeLoading, closeModal, timeLog]);

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			title={'Add time'}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start shadow-xl"
			titleClass="font-bold"
		>
			<form onSubmit={handleSubmit} className="text-sm w-[90%] md:w-full  flex flex-col justify-between gap-4">
				<div className="">
					<label className="block text-gray-500 mb-1">
						Date<span className="text-[#de5505e1] ml-1">*</span>
					</label>
					<div className="w-full p-2 border border-slate-100 dark:border-slate-600 rounded-md">
						<DatePicker
							buttonVariant={'link'}
							className="dark:bg-dark--theme-light"
							buttonClassName={'decoration-transparent h-[0.875rem] w-full flex items-center'}
							customInput={
								<div
									className={clsxm(
										'not-italic cursor-pointer font-semibold text-[0.625rem] 3xl:text-xs w-full',
										'leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white w-full'
									)}
								>
									{date ? (
										<div className="flex items-center w-full">
											<FaRegCalendarAlt
												size={20}
												fill={'#3826A6'}
												className="mx-[20px] text-[#3826A6]"
											/>
											{format(date, 'PPP')}
										</div>
									) : (
										<PencilSquareIcon className="dark:text-white text-dark w-4 h-4" />
									)}
								</div>
							}
							selected={date}
							onSelect={(value) => {
								value && setDate(value);
							}}
							mode={'single'}
						/>
					</div>
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
							className="w-full p-2 border font-bold border-slate-100 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
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
							className="w-full p-2 border font-bold border-slate-100 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
							required
						/>
					</div>
				</div>

				<div className=" flex items-center">
					<label className="block text-gray-500 mb-1">Added hours: </label>
					<div className="ml-[10px] p-1 flex items-center font-bold dark:border-regal-rose rounded-md border pr-3">
						<div className="mr-[10px] bg-gradient-to-tl from-[#3826A6] dark:from-regal-rose to-regal-blue rounded-full ">
							<HiMiniClock
								size={20}
								className="bg-gradient-to-tl from-regal-rose to-regal-blue rounded-full text-[#8a7bedb7] dark:text-to-regal-rose"
							/>
						</div>
						{timeDifference}
					</div>
				</div>

				<div className="">
					<label className="block text-gray-500 mb-1">
						Team<span className="text-[#de5505e1] ml-1">*</span>
					</label>
					<SelectItems
						defaultValue={activeTeam!}
						items={teams}
						onValueChange={(team) => setTeam(team)}
						itemId={(team) => (team ? team.name : '')}
						itemToString={(team) => (team ? team.name : '')}
						triggerClassName="border-slate-100 dark:border-slate-600"
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
						triggerClassName="border-slate-100 dark:border-slate-600"
					/>
				</div>

				<div className="flex flex-col">
					<label className="block text-gray-500 shrink-0">Description</label>
					<textarea
						value={description}
						placeholder="What worked on?"
						onChange={(e) => setDescription(e.target.value)}
						className="w-full p-2 grow border border-slate-100 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
					/>
				</div>

				<div className="">
					<label className="block text-gray-500 mb-1">Reason</label>
					<SelectItems
						items={manualTimeReasons.map((reason) => t(`manualTime.reasons.${reason}`))}
						onValueChange={(reason) => setReason(reason)}
						itemId={(reason) => reason}
						defaultValue={t('manualTime.reasons.DEFAULT')}
						itemToString={(reason) => reason}
						triggerClassName="border-slate-100 dark:border-slate-600"
					/>
				</div>

				<div className="flex justify-between items-center w-full pt-6">
					<Button
						variant="outline"
						type="button"
						className="dark:text-primary border-slate-100 dark:border-slate-600 font-bold  dark:bg-dark--theme-light"
					>
						View timesheet
					</Button>
					<Button
						loading={addManualTimeLoading}
						disabled={addManualTimeLoading}
						type="submit"
						className="bg-[#3826A6] font-bold  flex items-center text-white "
					>
						Add time
					</Button>
				</div>
				<div className="m-4 text-[#ff6a00de]">{errorMsg}</div>
			</form>
		</Modal>
	);
}
