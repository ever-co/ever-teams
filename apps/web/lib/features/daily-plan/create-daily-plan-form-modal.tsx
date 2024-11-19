import { Dispatch, memo, SetStateAction, useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DailyPlanStatusEnum, IDailyPlanMode, IOrganizationTeamList, OT_Member } from '@app/interfaces';
import { useAuthenticateUser, useDailyPlan, useOrganizationTeams } from '@app/hooks';
import { Avatar, Card, Modal, Text } from 'lib/components';
import { imgTitle, tomorrowDate, yesterdayDate } from '@app/helpers';
import { ReloadIcon } from '@radix-ui/react-icons';
import moment from 'moment';
import { Calendar } from '@components/ui/calendar';
import { Button } from '@components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@components/ui/command';
import { ScrollArea } from '@components/ui/scroll-bar';
import { clsxm, isValidUrl } from '@app/utils';
import stc from 'string-to-color';
import { Check } from 'lucide-react';
import { cn } from 'lib/utils';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { LAST_OPTION__CREATE_DAILY_PLAN_MODAL } from '@app/constants';
import { useTranslations } from 'next-intl';

export function CreateDailyPlanFormModal({
	open,
	closeModal,
	taskId,
	planMode,
	employeeId,
	chooseMember
}: {
	open: boolean;
	closeModal: () => void;
	taskId: string;
	planMode: IDailyPlanMode;
	employeeId?: string;
	chooseMember?: boolean;
}) {
	const { handleSubmit, reset } = useForm();
	const { user } = useAuthenticateUser();
	const { activeTeam, activeTeamManagers } = useOrganizationTeams();
	const { createDailyPlan, createDailyPlanLoading, profileDailyPlans } = useDailyPlan();
	const latestOption: 'Select' | 'Select & Close' | null = window.localStorage.getItem(
		LAST_OPTION__CREATE_DAILY_PLAN_MODAL
	) as 'Select' | 'Select & Close';
	const t = useTranslations();
	const existingPlanDates = useMemo(
		() => profileDailyPlans?.items?.map((plan) => new Date(plan.date)),
		[profileDailyPlans.items]
	);
	const existingTaskPlanDates = useMemo(
		() =>
			profileDailyPlans?.items
				?.filter((plan) => plan.tasks?.some((task) => task.id === taskId))
				.map((plan) => new Date(plan.date)),
		[profileDailyPlans.items, taskId]
	);

	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.find((member) => member.employee?.user?.id === user?.id),
		[activeTeamManagers, user?.id]
	);

	const [date, setDate] = useState<Date>(new Date(tomorrowDate));
	const [selectedEmployee, setSelectedEmployee] = useState<OT_Member | undefined>(isManagerConnectedUser);
	const [isOpen, setIsOpen] = useState(false);

	const handleMemberClick = useCallback((member: OT_Member) => {
		setSelectedEmployee(member);
	}, []);

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	const handleSelect = useCallback(() => {
		reset();
		window.localStorage.setItem(LAST_OPTION__CREATE_DAILY_PLAN_MODAL, 'Select');
	}, [reset]);

	const handleSelectAndClose = useCallback(() => {
		if (!createDailyPlanLoading) {
			handleCloseModal();
		}
		window.localStorage.setItem(LAST_OPTION__CREATE_DAILY_PLAN_MODAL, 'Select & Close');
	}, [createDailyPlanLoading, handleCloseModal]);

	const onSubmit = useCallback(
		async (values: any) => {
			const toDay = new Date();
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned) || 0,
				taskId,
				date:
					planMode == 'today'
						? toDay
						: planMode == 'tomorrow'
							? tomorrowDate
							: new Date(moment(date).format('YYYY-MM-DD')),
				status: DailyPlanStatusEnum.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: employeeId ?? selectedEmployee?.employeeId,
				organizationId: user?.employee.organizationId
			}).then(() => {
				reset();
				setIsOpen(false);
			});
		},
		[
			createDailyPlan,
			taskId,
			planMode,
			date,
			user?.tenantId,
			user?.employee.organizationId,
			employeeId,
			selectedEmployee?.employeeId,
			reset
		]
	);

	// Use the last selected option if there is one
	const lastSelectedOption = useMemo(
		() => (latestOption ? (latestOption == 'Select' ? handleSelect : handleSelectAndClose) : handleSelectAndClose),
		[handleSelect, handleSelectAndClose, latestOption]
	);

	return (
		<Modal isOpen={open} closeModal={handleCloseModal}>
			<form className="w-[98%] md:w-[430px] relative" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						{/* Form header */}
						<div className="mb-3">
							<Text.Heading as="h3" className="text-start">
								{t('common.SELECT_DATE')}
							</Text.Heading>
						</div>

						{/* Form Fields */}
						<div className="flex flex-col w-full gap-6">
							{chooseMember && isManagerConnectedUser && (
								<MembersList
									activeTeam={activeTeam}
									selectedMember={selectedEmployee}
									handleMemberClick={handleMemberClick}
								/>
							)}

							{planMode === 'custom' && (
								<div className="flex justify-center w-full">
									<CustomCalendar
										date={date}
										setDate={setDate}
										existingPlanDates={existingPlanDates}
										existingTaskPlanDates={existingTaskPlanDates}
									/>
								</div>
							)}
							<div className={clsxm(planMode === 'custom' ? 'flex justify-between gap-5 h-10' : '')}>
								<Button
									variant="outline"
									type="button"
									className="px-7 py-4 w-36 font-light rounded-md"
									onClick={() => closeModal()}
								>
									{t('common.CANCEL')}
								</Button>
								<div
									className={clsxm(
										'w-40 relative font-medium h-full text-xs bg-primary  cursor-pointer inline-block items-center rounded-md border text-left'
									)}
								>
									{createDailyPlanLoading ? (
										<div className="w-full h-full flex items-center justify-center">
											<ReloadIcon className="animate-spin text-white h-4 w-4" />
										</div>
									) : (
										<div className="w-full  h-full items-center overflow-hidden justify-between flex">
											<Button
												onClick={lastSelectedOption}
												className="w-full text-sm text-white h-full font-light flex items-center justify-center "
											>
												{latestOption ?? 'Select & close'}
											</Button>

											<div
												onClick={() => setIsOpen(!isOpen)}
												className=" flex items-center text-white justify-center w-8 h-full border-l"
											>
												<MdOutlineKeyboardArrowDown
													size={10}
													className={cn(
														'w-6 h-6 flex items-center justify-center transition-transform font-light',
														isOpen && 'rotate-180'
													)}
												/>
											</div>
										</div>
									)}

									{isOpen && (
										<div className="absolute z-5 right-0 w-full mt-2 p-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
											<div className="flex w-full flex-col items-center gap-1">
												<Button
													disabled={createDailyPlanLoading}
													onClick={handleSelect}
													size="sm"
													variant="outline"
													type="submit"
													className="w-full text-xs"
												>
													{t('common.SELECT')}
												</Button>
												<Button
													disabled={createDailyPlanLoading}
													onClick={handleSelectAndClose}
													size="sm"
													variant="outline"
													type="submit"
													className="w-full text-xs"
												>
													{t('common.SELECT_AND_CLOSE')}
												</Button>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}

const CustomCalendar = memo(function CustomCalendar({
	date,
	setDate,
	existingPlanDates,
	existingTaskPlanDates
}: {
	date: Date;
	setDate: Dispatch<SetStateAction<Date>>;
	existingPlanDates: Date[];
	existingTaskPlanDates: Date[];
}) {
	return (
		<Calendar
			mode="single"
			captionLayout="dropdown"
			selected={date}
			onSelect={(day) => setDate(day ? day : new Date(tomorrowDate))}
			initialFocus
			disabled={[{ from: new Date(1970, 1, 1), to: yesterdayDate }, ...existingTaskPlanDates]}
			modifiers={{
				booked: existingPlanDates
			}}
			modifiersClassNames={{
				booked: 'bg-primary text-white',
				today: clsxm('border-2 !border-yellow-700 rounded')
			}}
			fromYear={new Date().getUTCFullYear()}
			toYear={new Date().getUTCFullYear() + 5}
		/>
	);
});

function MembersList({
	activeTeam,
	handleMemberClick,
	selectedMember
}: {
	activeTeam: IOrganizationTeamList | null;
	selectedMember?: OT_Member;
	handleMemberClick: (member: OT_Member) => void;
}) {
	return (
		<Command className="overflow-hidden rounded-t-none border-t border-[#0000001A] dark:border-[#26272C]">
			<CommandInput placeholder="Search member..." />
			<CommandList>
				<CommandEmpty>No member founded</CommandEmpty>
				<ScrollArea className="h-[15rem]">
					<CommandGroup className="p-2">
						{activeTeam?.members.map((member) => (
							<CommandItem
								key={member?.id}
								className="flex items-center px-2 cursor-pointer"
								onSelect={() => {
									handleMemberClick(member);
								}}
							>
								<div
									className={clsxm(
										'w-[2.25rem] h-[2.25rem]',
										'flex justify-center items-center',
										'rounded-full text-xs text-default dark:text-white',
										'shadow-md text-lg font-normal'
									)}
									style={{
										backgroundColor: `${stc(member?.employee.fullName || '')}80`
									}}
								>
									{(member?.employee?.user?.image?.thumbUrl ||
										member?.employee?.user?.image?.fullUrl ||
										member?.employee?.user?.imageUrl) &&
									isValidUrl(
										member?.employee?.user?.image?.thumbUrl ||
											member?.employee?.user?.image?.fullUrl ||
											member?.employee?.user?.imageUrl ||
											''
									) ? (
										<Avatar
											size={36}
											className="relative cursor-pointer dark:border-[0.25rem] dark:border-[#26272C]"
											imageUrl={
												member?.employee?.user?.image?.thumbUrl ||
												member?.employee?.user?.image?.fullUrl ||
												member?.employee.user?.imageUrl
											}
											alt="Team Avatar"
											imageTitle={member?.employee.fullName || ''}
										></Avatar>
									) : member?.employee.fullName ? (
										imgTitle(member?.employee.fullName || ' ').charAt(0)
									) : (
										''
									)}
								</div>

								<div className="ml-2">
									<p className="text-sm font-medium leading-none">{member?.employee.fullName}</p>
									<p className="text-xs text-muted-foreground">{member?.employee.user?.email}</p>
								</div>
								{selectedMember?.id == member?.id && (
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
