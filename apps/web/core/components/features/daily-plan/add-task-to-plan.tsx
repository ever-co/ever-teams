import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useDailyPlan } from '@/core/hooks';
import { EDailyPlanStatus } from '@/core/types/generics/enums/daily-plan';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/core/components/common/command';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { formatDayPlanDate, tomorrowDate } from '@/core/lib/helpers/index';
import { Modal, Text } from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { CalendarIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { cn } from '@/core/lib/helpers';
import moment from 'moment';
import { Calendar } from '@/core/components/common/calendar';
import { EverCard } from '../../common/ever-card';
import { InputField } from '../../duplicated-components/_input';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

export function AddTaskToPlan({
	open,
	closeModal,
	task,
	employee
}: {
	open: boolean;
	closeModal: () => void;
	task: TTask;
	employee?: IEmployee;
}) {
	const { createDailyPlan, addTaskToPlan, getEmployeeDayPlans, profileDailyPlans, addTaskToPlanLoading } =
		useDailyPlan();
	const [selectedPlan, setSelectedPlan] = useState<TDailyPlan | null>(null);
	const [newPlan, setNewPlan] = useState<boolean>(false);
	const [date, setDate] = useState<Date>(new Date());
	const [workTimePlanned, setworkTimePlanned] = useState<number>(0);

	const handlePlanClick = useCallback((plan: TDailyPlan) => {
		setSelectedPlan(plan);
	}, []);

	const onSubmit = useCallback(async () => {
		newPlan
			? createDailyPlan({
					workTimePlanned: workTimePlanned,
					taskId: task.id,
					date: moment(date).format('YYYY-MM-DD'),
					status: EDailyPlanStatus.OPEN,
					tenantId: employee?.tenantId,
					employeeId: employee?.employeeId,
					organizationId: employee?.organizationId
				}).then(() => {
					closeModal();
				})
			: addTaskToPlan({ employeeId: employee?.employeeId ?? '', taskId: task.id }, selectedPlan?.id ?? '').then(
					() => {
						closeModal();
					}
				);
	}, [
		addTaskToPlan,
		closeModal,
		createDailyPlan,
		date,
		employee?.employeeId,
		employee?.organizationId,
		employee?.tenantId,
		newPlan,
		selectedPlan?.id,
		task.id,
		workTimePlanned
	]);

	useEffect(() => {
		getEmployeeDayPlans(employee?.employeeId ?? '');
	}, [employee?.employeeId, getEmployeeDayPlans]);

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative">
			<EverCard className="w-full" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<div className="mb-7">
						<Text.Heading as="h3" className="mb-3 text-center">
							ADD THE TASK TO DAY PLAN
						</Text.Heading>

						<Text className="text-sm text-center text-gray-500">
							You are adding the task &quot;<span className="font-bold text-black">{task.title}</span>
							&quot; to a plan
						</Text>
					</div>
					{newPlan ? (
						<div className="flex flex-col w-full gap-4 mb-5">
							<InputField
								type="number"
								placeholder="Working time to plan"
								className="mb-0 min-w-[350px]"
								wrapperClassName="mb-0 rounded-lg"
								onChange={(e) => setworkTimePlanned(parseFloat(e.target.value))}
								required
							/>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant={'outline'}
										className={cn(
											'justify-start text-left font-normal py-6 rounded-lg',
											!date && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className="w-4 h-4 mr-2" />
										{date ? moment(date).format('DD.MM.YYYY') : <span>Pick a date</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-full p-0 z-[1000]">
									<Calendar
										mode="single"
										selected={date}
										onSelect={(day: Date | undefined) =>
											setDate(day ? day : new Date(tomorrowDate))
										}
										initialFocus
										disabled={{
											from: new Date(1970, 1, 1),
											to: moment().subtract(1, 'days').toDate()
										}}
									/>
								</PopoverContent>
							</Popover>
						</div>
					) : (
						<PlansList
							handlePlanClik={handlePlanClick}
							plans={profileDailyPlans.items}
							selectedPlan={selectedPlan}
						/>
					)}
					<Button
						variant="default"
						type="submit"
						className="w-full font-normal p-7 rounded-xl text-md"
						disabled={addTaskToPlanLoading}
						onClick={onSubmit}
					>
						{addTaskToPlanLoading && <ReloadIcon className="w-4 h-4 mr-2 animate-spin" />}
						{newPlan ? 'Create new Plan' : 'Add task to plan'}
					</Button>
					<span
						className="mt-5 text-sm text-blue-600 underline cursor-pointer"
						onClick={() => setNewPlan((prev) => !prev)}
					>
						{newPlan ? 'Add to an existing plan' : 'Create a new Plan'}
					</span>
				</div>
			</EverCard>
		</Modal>
	);
}

function PlansList({
	plans,
	selectedPlan,
	handlePlanClik
}: {
	plans: TDailyPlan[];
	handlePlanClik: (plan: TDailyPlan) => void;
	selectedPlan: TDailyPlan | null;
}) {
	return (
		<Command className="overflow-hidden rounded-t-none border-t border-[#0000001A] dark:border-[#26272C]">
			<CommandInput placeholder="Search plan..." />
			<CommandList>
				<CommandEmpty>No plan founded</CommandEmpty>
				<ScrollArea className="h-[15rem]">
					<CommandGroup className="p-2">
						{plans
							.filter((plan) => {
								const planDate = new Date(plan?.date);
								const today = new Date();
								today.setHours(0, 0, 0, 0); // Set today time to exclude timestamps in comparization
								return planDate.getTime() > today.getTime();
							})
							.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
							.map((plan) => (
								<CommandItem
									key={plan?.id}
									className="flex items-center px-2 cursor-pointer"
									onSelect={() => {
										handlePlanClik(plan);
									}}
								>
									<div className="ml-2">
										<p className="text-sm font-medium leading-none">
											{plan?.date ? formatDayPlanDate(plan.date) : ''} ({plan?.tasks?.length})
										</p>
										<p className="text-xs text-muted-foreground">
											Planned time : {plan?.workTimePlanned}
										</p>
									</div>
									{selectedPlan?.id == plan?.id && (
										<Check className="flex w-5 h-5 ml-auto text-primary dark:text-white" />
									)}
								</CommandItem>
							))}
					</CommandGroup>
				</ScrollArea>
			</CommandList>
		</Command>
	);
}
