import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DailyPlanStatusEnum, IDailyPlanMode, IOrganizationTeamList, OT_Member } from '@app/interfaces';
import { useAuthenticateUser, useDailyPlan, useOrganizationTeams } from '@app/hooks';
import { Avatar, Card, InputField, Modal, Text } from 'lib/components';
import { imgTitle, tomorrowDate } from '@app/helpers';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { cn } from 'lib/utils';
import { CalendarIcon, ReloadIcon } from '@radix-ui/react-icons';
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
	const { handleSubmit, reset, register } = useForm();
	const { user } = useAuthenticateUser();
	const { activeTeam, activeTeamManagers } = useOrganizationTeams();
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();

	const isManagerConnectedUser = activeTeamManagers.find((member) => member.employee?.user?.id == user?.id);

	const [date, setDate] = useState<Date>(new Date(tomorrowDate));
	const [selectedEmployee, setSelectedEmployee] = useState<OT_Member | undefined>(isManagerConnectedUser);

	const handleMemberClick = useCallback((member: OT_Member) => {
		setSelectedEmployee(member);
	}, []);

	const onSubmit = useCallback(
		async (values: any) => {
			const toDay = new Date();
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned),
				taskId,
				date:
					planMode == 'today'
						? toDay
						: planMode == 'tomorow'
							? tomorrowDate
							: new Date(moment(date).format('YYYY-MM-DD')),
				status: DailyPlanStatusEnum.OPEN,
				tenantId: user?.tenantId,
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
							{chooseMember && isManagerConnectedUser && (
								<MembersList
									activeTeam={activeTeam}
									selectedMember={selectedEmployee}
									handleMemberClick={handleMemberClick}
								/>
							)}

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
											onSelect={(day) => setDate(day ? day : new Date(tomorrowDate))}
											initialFocus
											disabled={{ from: new Date(1970, 1, 1), to: tomorrowDate }}
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
