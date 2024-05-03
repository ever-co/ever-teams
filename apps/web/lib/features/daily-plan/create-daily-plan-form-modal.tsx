import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRecoilState } from 'recoil';
import { DailyPlanStatusEnum, IDailyPlanMode } from '@app/interfaces';
import { useDailyPlan } from '@app/hooks';
import { userState } from '@app/stores';
import { Card, InputField, Modal, Text } from 'lib/components';
import { tomorrowDate } from '@app/helpers';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { cn } from 'lib/utils';
import { CalendarIcon, ReloadIcon } from '@radix-ui/react-icons';
import moment from 'moment';
import { Calendar } from '@components/ui/calendar';
import { Button } from '@components/ui/button';

export function CreateDailyPlanFormModal({
	open,
	closeModal,
	taskId,
	planMode
}: {
	open: boolean;
	closeModal: () => void;
	taskId: string;
	planMode: IDailyPlanMode;
}) {
	const [user] = useRecoilState(userState);
	const { handleSubmit, reset, register } = useForm();
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();

	const [date, setDate] = useState<Date>(new Date(tomorrowDate));

	const onSubmit = useCallback(
		async (values: any) => {
			const toDay = new Date();
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned),
				taskId,
				date: planMode == 'today' ? toDay : planMode == 'tomorow' ? tomorrowDate : date,
				status: DailyPlanStatusEnum.OPEN,
				tenantId: user?.tenantId,
				employeeId: user?.employee.id,
				organizationId: user?.employee.organizationId
			}).then(() => {
				reset();
				closeModal();
			});
		},
		[
			createDailyPlan,
			taskId,
			planMode,
			date,
			user?.tenantId,
			user?.employee.id,
			user?.employee.organizationId,
			reset,
			closeModal
		]
	);
	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[530px] relative" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						{/* Form header */}
						<div className="mb-7">
							<Text.Heading as="h3" className="mb-3 text-center">
								CREATE A DAY PLAN
							</Text.Heading>

							<Text className="text-sm text-center text-gray-500">You are creating a new plan</Text>
						</div>

						{/* Form Fields */}
						<div className="flex flex-col w-full gap-3">
							<InputField
								type="number"
								placeholder="Working time to plan"
								className="mb-0 min-w-[350px]"
								wrapperClassName="mb-0 rounded-lg"
								required
								{...register('workTimePlanned')}
							/>

							{planMode === 'custom' && (
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant={'outline'}
											className={cn(
												'justify-start text-left font-normal py-6 rounded-lg',
												!date && 'text-muted-foreground'
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{date ? moment(date).format('DD.MM.YYYY') : <span>Pick a date</span>}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-full p-0 z-[9999]">
										<Calendar
											mode="single"
											selected={date}
											onSelect={(day) => setDate(day ?? new Date(tomorrowDate))}
											initialFocus
											disabled={{ from: new Date(1970, 1, 1), to: new Date() }}
											// de
										/>
									</PopoverContent>
								</Popover>
							)}

							<Button
								variant="default"
								type="submit"
								className="p-7 font-normal rounded-xl text-md"
								disabled={createDailyPlanLoading}
							>
								{createDailyPlanLoading && <ReloadIcon className="animate-spin mr-2 h-4 w-4" />}
								Create Plan
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
