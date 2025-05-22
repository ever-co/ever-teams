import { useOrganizationTeams, useTeamTasks } from '@/core/hooks';
import { Button } from '@/core/components/duplicated-components/_button';
import { Modal } from '@/core/components';
import { statusOptions } from '@/core/constants/config/constants';
import { MultiSelect } from '@/core/components/common/multi-select';
import { Input } from '@/core/components/common/input';
interface TimeSheetFilterProps {
	isOpen: boolean;
	closeModal: () => void;
}

export function TimeSheetFilter({ closeModal, isOpen }: TimeSheetFilterProps) {
	const { activeTeam } = useOrganizationTeams();
	const { tasks } = useTeamTasks();
	// const [taskId, setTaskId] = useState<ITask | ITask[] | null>([]);
	return (
		<>
			<Modal
				isOpen={isOpen}
				closeModal={closeModal}
				title={'Filters'}
				className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl !w-[350px]  md:w-40 md:min-w-[24rem] h-[auto] justify-start shadow-xl"
				titleClass="font-bold"
			>
				<div className="w-full flex flex-col">
					<div className="grid gap-5">
						<div className="">
							<label className="block text-gray-600 mb-1 text-sm">
								<span className="text-[12px]">Project</span>
								<span className="text-[#de5505e1] ml-1 text-sm">*</span>
							</label>
							<MultiSelect
								items={activeTeam?.members ?? []}
								itemToString={(members) => (members ? members.employee.fullName : '')}
								itemId={(item) => item.id}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
								triggerClassName="dark:border-gray-700"
							/>
						</div>
						<div className="">
							<label className="block text-gray-600 mb-1 text-sm">
								<span className="text-[12px]">Employee</span>
								<span className="text-[#de5505e1] ml-1 text-sm">*</span>
							</label>
							<MultiSelect
								items={activeTeam?.members ?? []}
								itemToString={(members) => (members ? members.employee.fullName : '')}
								itemId={(item) => item.id}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
								triggerClassName="dark:border-gray-700"
							/>
						</div>
						<div className="">
							<label className="block text-gray-600 mb-1 text-sm">
								<span className="text-[12px]">Status</span>
								<span className="text-[#de5505e1] ml-1 text-sm">*</span>
							</label>
							<MultiSelect
								items={statusOptions}
								itemToString={(status) => (status ? status.value : '')}
								itemId={(item) => item.value}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
								triggerClassName="dark:border-gray-700"
							/>
						</div>
						<div className="">
							<label className="block text-gray-600 mb-1 text-sm">
								<span className="text-[12px]">Task</span>
								<span className="text-[#de5505e1] ml-1 text-sm">*</span>
							</label>
							<MultiSelect
								items={tasks}
								onValueChange={(task) => task}
								itemId={(task) => (task ? task.id : '')}
								itemToString={(task) => (task ? task.title : '')}
								multiSelect={true} // Enable multi-select
								triggerClassName="dark:border-gray-700"
							/>
						</div>
						<div className="">
							<label className="block text-gray-600 mb-1 text-sm">
								<span className="text-[12px]">Activity Level</span>
								<span className="text-[#de5505e1] ml-1 text-sm">*</span>
							</label>
							<MultiSelect
								items={activeTeam?.members ?? []}
								itemToString={(members) => (members ? members.employee.fullName : '')}
								itemId={(item) => item.id}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
								triggerClassName="dark:border-gray-700"
							/>
						</div>
						<div className="">
							<label className="block text-gray-600 mb-1 text-sm">
								<span className="text-[12px]">Worked hours</span>
								<span className="text-[#de5505e1] ml-1 text-sm">*</span>
							</label>
							<div className="flex items-center w-full justify-between gap-x-4">
								<Input
									className="border w-full dark:border-gray-700"
									placeholder="Time"
									required
									value=""
									name="from"
								/>
								<span>to</span>
								<Input
									className="border w-full dark:border-gray-700"
									placeholder="Time"
									required
									value=""
									name="to"
								/>
							</div>
						</div>
						<div className="flex items-center justify-between gap-x-4 w-full">
							<Button
								variant={'outline'}
								className="flex items-center text-sm justify-center h-10 w-full rounded-lg  dark:text-gray-300"
							>
								<span className="text-sm">Clear Filter</span>
							</Button>
							<Button className="flex items-center text-sm justify-center h-10 w-full rounded-lg bg-primary dark:bg-primary-light dark:text-gray-300">
								<span className="text-sm">Apply Filter</span>
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
}
