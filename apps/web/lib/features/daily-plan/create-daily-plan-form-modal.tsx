import { Dispatch, memo, SetStateAction, useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DailyPlanStatusEnum, IDailyPlanMode, IOrganizationTeamList, OT_Member } from '@app/interfaces';
import { useAuthenticateUser, useDailyPlan, useOrganizationTeams } from '@app/hooks';
import { Avatar, Card, Modal, Text } from 'lib/components';
import { imgTitle, tomorrowDate } from '@app/helpers';
import { ReloadIcon } from '@radix-ui/react-icons';
import moment from 'moment';
import { Calendar } from '@components/ui/calendar';
import { Button } from '@components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@components/ui/command';
import { ScrollArea } from '@components/ui/scroll-bar';
import { clsxm, isValidUrl } from '@app/utils';
import stc from 'string-to-color';
import { Check } from 'lucide-react';

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

	const existingPlanDates = useMemo(
		() => profileDailyPlans.items.map((plan) => new Date(plan.date)),
		[profileDailyPlans.items]
	);

	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.find((member) => member.employee?.user?.id === user?.id),
		[activeTeamManagers, user?.id]
	);

	const [date, setDate] = useState<Date>(new Date(tomorrowDate));
	const [selectedEmployee, setSelectedEmployee] = useState<OT_Member | undefined>(isManagerConnectedUser);

	const handleMemberClick = useCallback((member: OT_Member) => {
		setSelectedEmployee(member);
	}, []);

	const onSubmit = useCallback(
		async (values: any) => {
			const toDay = new Date();
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned) || 0,
				taskId,
				date:
					planMode == 'today'
						? toDay
						: planMode == 'tomorow'
							? tomorrowDate
							: new Date(moment(date).format('YYYY-MM-DD')),
				status: DailyPlanStatusEnum.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: employeeId ?? selectedEmployee?.employeeId,
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
			user?.employee.organizationId,
			employeeId,
			selectedEmployee?.employeeId,
			reset,
			closeModal
		]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[430px] relative" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						{/* Form header */}
						<div className="mb-3">
							<Text.Heading as="h3" className="text-start">
								Plan this task for {moment(date).format('DD.MM.YYYY').toString()}
							</Text.Heading>
						</div>

						{/* Form Fields */}
						<div className="flex flex-col w-full gap-3">
							{chooseMember && isManagerConnectedUser && (
								<MembersList
									activeTeam={activeTeam}
									selectedMember={selectedEmployee}
									handleMemberClick={handleMemberClick}
								/>
							)}

							{/* <InputField
								type="number"
								placeholder="Working time to plan"
								className="mb-0 min-w-[350px]"
								wrapperClassName="mb-0 rounded-lg"
								// required
								{...register('workTimePlanned')}
							/> */}

							{planMode === 'custom' && (
								<div className="flex justify-center w-full">
									<CustomCalendar
										date={date}
										setDate={setDate}
										existingPlanDates={existingPlanDates}
									/>
								</div>
							)}
							<div className={clsxm(planMode === 'custom' ? 'flex justify-between gap-5' : '')}>
								<Button
									variant="outline"
									type="button"
									className="px-7 py-4 font-normal rounded-xl text-md"
									onClick={() => closeModal()}
								>
									Cancel
								</Button>
								<Button
									variant="default"
									type="submit"
									className="px-7 py-4 font-normal rounded-xl text-md"
									disabled={createDailyPlanLoading}
								>
									{createDailyPlanLoading && <ReloadIcon className="animate-spin mr-2 h-4 w-4" />}
									{planMode === 'custom' ? 'Select Date' : 'Create Plan'}
								</Button>
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
	existingPlanDates
}: {
	date: Date;
	setDate: Dispatch<SetStateAction<Date>>;
	existingPlanDates: Date[];
}) {
	return (
		<Calendar
			mode="single"
			captionLayout="dropdown"
			selected={date}
			onSelect={(day) => setDate(day ? day : new Date(tomorrowDate))}
			initialFocus
			disabled={[...existingPlanDates, { from: new Date(1970, 1, 1), to: tomorrowDate }]}
			modifiers={{
				booked: existingPlanDates
			}}
			modifiersClassNames={{ booked: 'bg-primary text-white' }}
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
