import { Button } from '@/core/components/duplicated-components/_button';
import { Modal } from '@/core/components';
import { statusOptions } from '@/core/constants/config/constants';
import { MultiSelect } from '@/core/components/common/multi-select';
import { Input } from '@/core/components/common/input';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useId } from 'react';
interface TimeSheetFilterProps {
	isOpen: boolean;
	closeModal: () => void;
}

export function TimeSheetFilter({ closeModal, isOpen }: TimeSheetFilterProps) {
	const activeTeam = useAtomValue(activeTeamState);

	const tasks = useAtomValue(tasksByTeamState);
	const workedHoursId = useId();
	// const [taskId, setTaskId] = useState<TTask | TTask[] | null>([]);
	return (
		<>
			<Modal
				isOpen={isOpen}
				closeModal={closeModal}
				title={'Filters'}
				className="!w-[350px] md:w-40 md:min-w-[24rem] justify-start"
			>
				<div className="flex flex-col w-full">
					<div className="grid gap-5">
						<div className="">
							<span className="mb-1.5 block text-sm font-medium leading-none text-foreground">
								<span>Project</span>
								<span className="ml-1 text-destructive-ink">*</span>
							</span>
							<MultiSelect
								items={activeTeam?.members ?? []}
								itemToString={(members) => (members ? members.employee?.fullName || '' : '')}
								itemId={(item) => item.id}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
							/>
						</div>
						<div className="">
							<span className="mb-1.5 block text-sm font-medium leading-none text-foreground">
								<span>Employee</span>
								<span className="ml-1 text-destructive-ink">*</span>
							</span>
							<MultiSelect
								items={activeTeam?.members ?? []}
								itemToString={(members) => (members ? members.employee?.fullName || '' : '')}
								itemId={(item) => item.id}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
							/>
						</div>
						<div className="">
							<span className="mb-1.5 block text-sm font-medium leading-none text-foreground">
								<span>Status</span>
								<span className="ml-1 text-destructive-ink">*</span>
							</span>
							<MultiSelect
								items={statusOptions}
								itemToString={(status) => (status ? status.value : '')}
								itemId={(item) => item.value}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
							/>
						</div>
						<div className="">
							<span className="mb-1.5 block text-sm font-medium leading-none text-foreground">
								<span>Task</span>
								<span className="ml-1 text-destructive-ink">*</span>
							</span>
							<MultiSelect
								items={tasks}
								onValueChange={(task) => task}
								itemId={(task) => (task ? task.id : '')}
								itemToString={(task) => (task ? task.title : '')}
								multiSelect={true} // Enable multi-select
							/>
						</div>
						<div className="">
							<span className="mb-1.5 block text-sm font-medium leading-none text-foreground">
								<span>Activity Level</span>
								<span className="ml-1 text-destructive-ink">*</span>
							</span>
							<MultiSelect
								items={activeTeam?.members ?? []}
								itemToString={(members) => (members ? members.employee?.fullName || '' : '')}
								itemId={(item) => item.id}
								onValueChange={(selectedItems) => console.log(selectedItems)}
								multiSelect={true} // Enable multi-select
							/>
						</div>
						<div className="">
							<span
								id={workedHoursId}
								className="mb-1.5 block text-sm font-medium leading-none text-foreground"
							>
								<span>Worked hours</span>
								<span className="ml-1 text-destructive-ink">*</span>
							</span>
							<div className="flex gap-x-4 justify-between items-center w-full">
								<Input
									aria-labelledby={workedHoursId}
									className="w-full"
									placeholder="Time"
									required
									value=""
									name="from"
								/>
								<span className="text-sm text-muted-foreground">to</span>
								<Input
									aria-labelledby={workedHoursId}
									className="w-full"
									placeholder="Time"
									required
									value=""
									name="to"
								/>
							</div>
						</div>
						<div className="flex gap-x-4 justify-between items-center w-full">
							<Button variant={'outline'} size="lg" className="w-full">
								<span className="text-sm">Clear Filter</span>
							</Button>
							<Button size="lg" className="w-full">
								<span className="text-sm">Apply Filter</span>
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
}
