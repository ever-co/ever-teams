import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { StatusIcon, statusIcons } from './dropdownIcons';
import { ITaskStatus, ITeamTask } from '@app/interfaces/ITask';
import { useTeamTasks } from '@app/hooks/useTeamTasks';
import { Spinner } from '../spinner';

const statusKeys = Object.keys(statusIcons) as ITaskStatus[];

const StatusDropdown = () => {
	const { activeTeamTask } = useTeamTasks();

	return <RawStatusDropdown task={activeTeamTask} />;
};

export function RawStatusDropdown({ task }: { task: ITeamTask | null }) {
	const { updateTask, updateLoading } = useTeamTasks();
	const [selected, setSelected] = useState<ITaskStatus | null>(
		task?.status || null
	);

	useEffect(() => {
		setSelected(task?.status || null);
	}, [task]);

	useEffect(() => {
		setSelected(task?.status || null);
	}, [task]);

	const handleChange = useCallback(
		(status: ITaskStatus) => {
			setSelected(status);

			if (task && status !== task.status) {
				updateTask({
					...task,
					status: status,
				});
			}
		},
		[task, updateTask]
	);

	return (
		<div className="w-[145px] max-w-[150px] h-[30px]">
			<Combobox
				value={selected}
				onChange={handleChange}
				disabled={task ? false : true}
			>
				<div
					className={`relative w-full cursor-default overflow-hidden rounded-lg  ${
						task ? 'bg-[#EEEFF5]' : 'bg-white'
					} dark:bg-[#1B1B1E] text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm`}
				>
					<div className="flex px-[10px] items-center justify-center">
						{selected && (
							<Combobox.Label className="mr-1">
								<StatusIcon status={selected} />
							</Combobox.Label>
						)}
						<Combobox.Input
							className={`h-[30px] ${
								task ? 'bg-[#F0ECFD]' : 'bg-white'
							} dark:bg-[#1B1B1E] placeholder-[#9490A0] dark:placeholder-[#616164] w-full rounded-[10px] outline-none py-1`}
							displayValue={(status: ITaskStatus) => status}
							onChange={() => {
								//
							}}
							readOnly
							placeholder="Status"
						/>
					</div>
					<Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
						{updateLoading ? (
							<span className="ml-2 h-5 w-5">
								<Spinner dark={false} />
							</span>
						) : (
							<ChevronDownIcon
								className={`ml-2 h-5 w-5 text-primary dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80`}
								aria-hidden="true"
							/>
						)}
					</Combobox.Button>
				</div>
				<Transition
					as={Fragment}
					leave="transition ease-in duration-100"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<Combobox.Options className="absolute z-10 mt-1 max-h-60 w-[141px] overflow-auto rounded-md bg-[#FFFFFF] dark:bg-[#1B1B1E] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
						{statusKeys.map((status) => {
							return (
								<Combobox.Option
									key={status}
									value={status}
									className={({ active }) =>
										`relative cursor-pointer select-none py-2 pl-5 pr-4 ${
											active
												? 'bg-[#F9FAFB] text-primary dark:text-white dark:bg-[#202023] cursor-pointer'
												: ` dark:text-white`
										}`
									}
								>
									{({ selected }) => (
										<>
											<span
												className={`truncate h-[20px] flex items-center ${
													selected ? 'font-medium' : 'font-normal'
												}`}
											>
												<div
													className={`flex items-center justify-start w-full text-xs text-[#8F97A1]`}
												>
													<div className="mr-[9px]">
														<StatusIcon status={status} />
													</div>
													{status}
												</div>
											</span>
										</>
									)}
								</Combobox.Option>
							);
						})}
					</Combobox.Options>
				</Transition>
			</Combobox>
		</div>
	);
}

export default StatusDropdown;
