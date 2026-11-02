import { useCallback, useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Check, Spinner } from '@/core/components/icons';
import { useTranslations } from 'next-intl';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useCreateDailyPlan } from '@/core/hooks/daily-plans/use-create-daily-plan';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
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
import { formatDayPlanDate, getDailyPlanDay, getTomorrowDate } from '@/core/lib/helpers/index';
import { Modal, modalFooterClass, modalPrimaryActionClass } from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { cn } from '@/core/lib/helpers';
import moment from 'moment';
import { Calendar } from '@/core/components/common/calendar';
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
	// Use specialized hooks with employee?.id to get the correct employee's plans
	const { employeeDailyPlans, getEmployeeDailyPlans } = useEmployeeDailyPlans(employee?.id ?? null);
	const { createDailyPlan } = useCreateDailyPlan();
	const { addTaskToPlan, addTaskToPlanLoading } = useUpdateDailyPlan();
	const [selectedPlan, setSelectedPlan] = useState<TDailyPlan | null>(null);
	const [newPlan, setNewPlan] = useState<boolean>(false);
	const [date, setDate] = useState<Date>(new Date());
	const [workTimePlanned, setworkTimePlanned] = useState<number>(0);
	const t = useTranslations();

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
			: addTaskToPlan(
					{
						taskId: task.id,
						employeeId: employee?.employeeId,
						organizationId: employee?.organizationId
					},
					selectedPlan?.id ?? ''
				).then(() => {
					closeModal();
				});
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
		selectedPlan?.employeeId,
		selectedPlan?.organizationId,
		task.id,
		workTimePlanned
	]);

	useEffect(() => {
		getEmployeeDailyPlans();
	}, [employee?.id, getEmployeeDailyPlans]);

	let submitPlanLabel = t('modals.addTaskToPlan.addToPlan');
	let switchPlanLabel = t('modals.addTaskToPlan.createNewPlan');
	if (newPlan) {
		submitPlanLabel = t('modals.addTaskToPlan.createPlan');
		switchPlanLabel = t('modals.addTaskToPlan.useExistingPlan');
	}

	return (
		<Modal
			isOpen={open}
			closeModal={closeModal}
			className="relative w-[98%] md:w-[30rem]"
			title={t('modals.addTaskToPlan.title')}
			description={t('modals.addTaskToPlan.description', { title: task.title })}
		>
			<div className="w-full">
				<div className="flex flex-col justify-between items-stretch gap-4">
					{newPlan ? (
						<div className="flex flex-col gap-4 mb-5 w-full">
							<InputField
								type="number"
								placeholder={t('modals.addTaskToPlan.workTimePlaceholder')}
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
											'h-9 justify-start text-left font-normal',
											!date && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className="mr-2 w-4 h-4" />
										{date ? (
											moment(date).format('DD.MM.YYYY')
										) : (
											<span>{t('manualTime.PICK_A_DATE')}</span>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-full p-0 z-[1000]">
									<Calendar
										mode="single"
										selected={date}
										onSelect={(day: Date | undefined) => setDate(day ?? getTomorrowDate())}
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
							plans={employeeDailyPlans.items}
							selectedPlan={selectedPlan}
						/>
					)}
					<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
						<button
							type="button"
							className="cursor-pointer text-[13px] text-primary-ink underline-offset-4 hover:underline"
							onClick={() => setNewPlan((prev) => !prev)}
						>
							{switchPlanLabel}
						</button>
						<div className={modalFooterClass}>
							<Button
								variant="default"
								type="submit"
								className={modalPrimaryActionClass}
								disabled={addTaskToPlanLoading}
								onClick={onSubmit}
							>
								{addTaskToPlanLoading && <Spinner className="size-4 animate-spin" />}
								{submitPlanLabel}
							</Button>
						</div>
					</div>
				</div>
			</div>
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
	const t = useTranslations();
	return (
		<Command className="overflow-hidden rounded-lg hairline-ring ring-border">
			<CommandInput placeholder={t('modals.addTaskToPlan.searchPlan')} />
			<CommandList>
				<CommandEmpty>{t('modals.addTaskToPlan.noPlanFound')}</CommandEmpty>
				<ScrollArea className="h-[15rem]">
					<CommandGroup className="p-2">
						{plans
							.filter((plan) => getDailyPlanDay(plan?.date) >= moment().format('YYYY-MM-DD'))
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
										<p className="text-[13px] font-medium leading-none">
											{plan?.date ? formatDayPlanDate(plan.date) : ''} ({plan?.tasks?.length})
										</p>
										<PlannedTime hours={plan?.workTimePlanned} />
									</div>
									{selectedPlan?.id == plan?.id && (
										<Check className="flex ml-auto size-4 text-primary-ink" />
									)}
								</CommandItem>
							))}
					</CommandGroup>
				</ScrollArea>
			</CommandList>
		</Command>
	);
}

function PlannedTime({ hours }: { hours?: number | null }) {
	const t = useTranslations();
	const hasPlannedTime = typeof hours === 'number';
	if (!hasPlannedTime) {
		return null;
	}
	return <p className="text-xs text-muted-foreground">{t('modals.addTaskToPlan.plannedTime', { hours })}</p>;
}
