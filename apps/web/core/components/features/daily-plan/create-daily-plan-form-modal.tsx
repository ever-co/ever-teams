import { Dispatch, FormEvent, memo, SetStateAction, useCallback, useMemo, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useCreateDailyPlan } from '@/core/hooks/daily-plans/use-create-daily-plan';
import { getDailyPlanDay, getTomorrowDate, getYesterdayDate } from '@/core/lib/helpers/index';
import moment from 'moment';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { Calendar } from '@/core/components/common/calendar';
import { PLANNED_DAY_MARK } from './plan-editor/plan-day-marks';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/core/components/common/command';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { EntityTile } from '@/core/components/common/entity-tile';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { DateGlyph } from '@/core/components/common/value-glyphs';
import { ChevronDown } from '@/core/components/icons';
import { PersonFace, teamImageOf } from '@/core/components/projects/project-cells';
import { isValidUrl } from '@/core/lib/utils';
import { cn } from '@/core/lib/helpers';
import { LAST_OPTION__CREATE_DAILY_PLAN_MODAL } from '@/core/constants/config/constants';
import { useLocale, useTranslations } from 'next-intl';
import { EDailyPlanStatus, EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import { TDailyPlan, TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useAtomValue } from 'jotai';
import { activeTeamManagersState, activeTeamState } from '@/core/stores';

// The stored values stay in English: earlier versions already wrote them to localStorage.
const SELECT_OPTION = 'Select';
const SELECT_AND_CLOSE_OPTION = 'Select & Close';

type SubmitOption = typeof SELECT_OPTION | typeof SELECT_AND_CLOSE_OPTION;

const SUBMIT_OPTIONS: SubmitOption[] = [SELECT_OPTION, SELECT_AND_CLOSE_OPTION];

const SUBMIT_OPTION_LABEL_KEY = {
	[SELECT_OPTION]: 'common.SELECT',
	[SELECT_AND_CLOSE_OPTION]: 'common.SELECT_AND_CLOSE'
} as const;

function rememberedSubmitOption(): SubmitOption {
	if (typeof window === 'undefined') {
		return SELECT_AND_CLOSE_OPTION;
	}
	const stored = window.localStorage.getItem(LAST_OPTION__CREATE_DAILY_PLAN_MODAL);
	if (stored === SELECT_OPTION) {
		return SELECT_OPTION;
	}
	return SELECT_AND_CLOSE_OPTION;
}

function planDayOf(planMode: EDailyPlanMode, pickedDate: Date) {
	if (planMode === EDailyPlanMode.TODAY) {
		return moment();
	}
	if (planMode === EDailyPlanMode.TOMORROW) {
		return moment().add(1, 'day');
	}
	return moment(pickedDate);
}

// Days before the current one cannot be planned, even when the calendar showed them when they were picked
const isBeforeToday = (day: Date) => {
	const today = moment();
	return moment(day).isBefore(today, 'day');
};

// A custom day picked before midnight is in the past when the form is submitted after it
const isPastCustomDay = (planMode: EDailyPlanMode, day: Date) => {
	const isCustomMode = planMode === EDailyPlanMode.CUSTOM;
	return isCustomMode && isBeforeToday(day);
};

// A selected day that is no longer ahead of the current day goes back to tomorrow
const keepUpcomingDay = (selectedDay: Date) => {
	const today = moment();
	const isUpcoming = moment(selectedDay).isAfter(today, 'day');
	if (isUpcoming) {
		return selectedDay;
	}
	return getTomorrowDate();
};

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
	planMode: EDailyPlanMode;
	employeeId?: string;
	chooseMember?: boolean;
}) {
	const { handleSubmit, reset } = useForm();
	const { data: user } = useUserQuery();

	const activeTeam = useAtomValue(activeTeamState);

	const activeTeamManagers = useAtomValue(activeTeamManagersState);

	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.find((member) => member.employee?.user?.id === user?.id),
		[activeTeamManagers, user?.id]
	);

	const [date, setDate] = useState<Date>(getTomorrowDate);
	// The form stays mounted while the modal is closed, so the selected day is checked again each time it opens
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setDate(keepUpcomingDay);
		}
	}
	const [selectedEmployee, setSelectedEmployee] = useState<TOrganizationTeamEmployee | undefined>(
		isManagerConnectedUser
	);
	const [submitOption, setSubmitOption] = useState<SubmitOption>(rememberedSubmitOption);

	// Use specialized hooks with employeeId to get the correct employee's plans
	// Use useEmployeeDailyPlans to check for duplicates
	// NOTE: Include selectedEmployee?.employeeId to ensure we check plans for the dynamically selected user (e.g. by manager)
	const { employeeDailyPlans } = useEmployeeDailyPlans(employeeId ?? selectedEmployee?.employeeId ?? null);
	const { createDailyPlan, createDailyPlanLoading } = useCreateDailyPlan();
	const t = useTranslations();
	const existingPlanDates = useMemo(
		() => employeeDailyPlans?.items?.map((plan: TDailyPlan) => moment(getDailyPlanDay(plan.date)).toDate()),
		[employeeDailyPlans.items]
	);
	const existingTaskPlanDates = useMemo(
		() =>
			employeeDailyPlans?.items
				?.filter((plan: TDailyPlan) => plan.tasks?.some((task) => task.id === taskId))
				.map((plan: TDailyPlan) => moment(getDailyPlanDay(plan.date)).toDate()),
		[employeeDailyPlans.items, taskId]
	);

	const handleMemberClick = useCallback((member: TOrganizationTeamEmployee) => {
		setSelectedEmployee(member);
	}, []);

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	const rememberSubmitOption = useCallback((option: SubmitOption) => {
		window.localStorage.setItem(LAST_OPTION__CREATE_DAILY_PLAN_MODAL, option);
		setSubmitOption(option);
	}, []);

	const handleSelect = useCallback(() => {
		reset();
		rememberSubmitOption(SELECT_OPTION);
	}, [rememberSubmitOption, reset]);

	const handleSelectAndClose = useCallback(() => {
		// The submission moves a day that went past to tomorrow, so the modal stays open to show it
		const isSelectedDayPast = isPastCustomDay(planMode, date);
		const canClose = !createDailyPlanLoading && !isSelectedDayPast;
		if (canClose) {
			handleCloseModal();
		}
		rememberSubmitOption(SELECT_AND_CLOSE_OPTION);
	}, [createDailyPlanLoading, handleCloseModal, rememberSubmitOption, planMode, date]);

	const onSubmit = useCallback(
		(values: FieldValues) => {
			if (isPastCustomDay(planMode, date)) {
				setDate(getTomorrowDate());
				return;
			}
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned) || 0,
				taskId,
				date: planDayOf(planMode, date).format('YYYY-MM-DD'),
				status: EDailyPlanStatus.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: employeeId ?? selectedEmployee?.employeeId ?? undefined,
				organizationId: user?.employee?.organizationId
			}).then(() => {
				reset();
			});
		},
		[
			createDailyPlan,
			taskId,
			planMode,
			date,
			user?.tenantId,
			user?.employee?.organizationId,
			employeeId,
			selectedEmployee?.employeeId,
			reset
		]
	);

	const submitWith = useCallback(
		(option: SubmitOption) => {
			if (option === SELECT_OPTION) {
				handleSelect();
			} else {
				handleSelectAndClose();
			}
			void handleSubmit(onSubmit)();
		},
		[handleSelect, handleSelectAndClose, handleSubmit, onSubmit]
	);

	const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		submitWith(submitOption);
	};

	const isCustomMode = planMode === EDailyPlanMode.CUSTOM;
	const showsMemberPicker = Boolean(chooseMember) && Boolean(isManagerConnectedUser);

	const teamContext = activeTeam && (
		<>
			<EntityTile
				name={activeTeam.name}
				color={activeTeam.color}
				imageUrl={teamImageOf(activeTeam)}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{activeTeam.name}</span>
		</>
	);

	return (
		<AppDialog open={open} onClose={handleCloseModal} width="sm" keepOpenOnOutsideClick>
			<form noValidate autoComplete="off" onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col">
				<AppDialogHeader title={t('common.SELECT_DATE')} context={teamContext} onClose={handleCloseModal} />
				<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pt-1 pb-5')}>
					{showsMemberPicker && (
						<MembersList
							activeTeam={activeTeam}
							selectedMember={selectedEmployee}
							handleMemberClick={handleMemberClick}
						/>
					)}
					{isCustomMode && (
						<div className="flex justify-center">
							<CustomCalendar
								date={date}
								setDate={setDate}
								existingPlanDates={existingPlanDates}
								existingTaskPlanDates={existingTaskPlanDates}
							/>
						</div>
					)}
					{!isCustomMode && <PlanDaySummary planMode={planMode} />}
				</div>
				<div className={APP_DIALOG_FOOTER}>
					<Button type="button" variant="ghost" size="default" onClick={handleCloseModal} className="ml-auto">
						{t('common.CANCEL')}
					</Button>
					<div className="inline-flex">
						<Button
							type="submit"
							size="default"
							loading={createDailyPlanLoading}
							data-initial-focus=""
							className="rounded-r-none"
						>
							{t(SUBMIT_OPTION_LABEL_KEY[submitOption])}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild disabled={createDailyPlanLoading}>
								<Button
									type="button"
									size="default"
									aria-label={t('modals.dailyPlan.moreOptions')}
									className="rounded-l-none px-2"
								>
									<ChevronDown />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-44">
								{SUBMIT_OPTIONS.map((option) => (
									<DropdownMenuItem
										key={option}
										disabled={createDailyPlanLoading}
										onClick={() => submitWith(option)}
									>
										<span className="flex-1">{t(SUBMIT_OPTION_LABEL_KEY[option])}</span>
										{option === submitOption && <SelectedMark />}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</form>
		</AppDialog>
	);
}

function PlanDaySummary({ planMode }: Readonly<{ planMode: EDailyPlanMode }>) {
	const t = useTranslations();
	const locale = useLocale();
	const day = planDayOf(planMode, new Date()).toDate();
	const dayText = day.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
	let label = t('dailyPlan.PLAN_FOR_TODAY');
	if (planMode === EDailyPlanMode.TOMORROW) {
		label = t('dailyPlan.PLAN_FOR_TOMORROW');
	}
	return (
		<div className="flex items-center gap-2.5 rounded-lg bg-foreground/2.5 px-3 py-2.5">
			<DateGlyph date={day} />
			<span className="min-w-0 truncate text-[13px] font-medium text-foreground">{label}</span>
			<span className="ml-auto shrink-0 text-xs text-muted-foreground">{dayText}</span>
		</div>
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
	const yesterday = getYesterdayDate();
	const pastDays = { from: new Date(1970, 1, 1), to: yesterday };

	const handleDaySelect = (day: Date | undefined) => {
		const selectedDay = day ?? getTomorrowDate();
		// A calendar left open past midnight still offers the day before
		if (isBeforeToday(selectedDay)) {
			return;
		}
		setDate(selectedDay);
	};

	return (
		<Calendar
			mode="single"
			captionLayout="buttons"
			selected={date}
			onSelect={handleDaySelect}
			disabled={[pastDays, ...existingTaskPlanDates]}
			modifiers={{
				booked: existingPlanDates
			}}
			modifiersClassNames={{
				booked: PLANNED_DAY_MARK
			}}
			fromYear={new Date().getUTCFullYear()}
			toYear={new Date().getUTCFullYear() + 5}
			className="p-0"
		/>
	);
});

function memberImageUrlOf(member: TOrganizationTeamEmployee) {
	const user = member.employee?.user;
	const imageUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	if (!imageUrl) {
		return null;
	}
	if (!isValidUrl(imageUrl)) {
		return null;
	}
	return imageUrl;
}

function personOf(member: TOrganizationTeamEmployee) {
	return {
		id: member.id,
		name: member.employee?.fullName || '',
		imageUrl: memberImageUrlOf(member),
		email: member.employee?.user?.email
	};
}

function MemberRow({
	member,
	isSelected,
	onSelect
}: Readonly<{
	member: TOrganizationTeamEmployee;
	isSelected: boolean;
	onSelect: (member: TOrganizationTeamEmployee) => void;
}>) {
	const person = personOf(member);
	return (
		<CommandItem onSelect={() => onSelect(member)} className="min-h-10 gap-2.5">
			<PersonFace person={person} className="size-6 text-[9px]" />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-[13px] text-foreground">{person.name}</span>
				<span className="truncate text-xs text-muted-foreground">{person.email}</span>
			</span>
			{isSelected && <SelectedMark />}
		</CommandItem>
	);
}

function MembersList({
	activeTeam,
	handleMemberClick,
	selectedMember
}: {
	activeTeam: TOrganizationTeam | null;
	selectedMember?: TOrganizationTeamEmployee;
	handleMemberClick: (member: TOrganizationTeamEmployee) => void;
}) {
	const t = useTranslations();
	const members = activeTeam?.members ?? [];
	return (
		<Command className="overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
			<CommandInput data-initial-focus="" placeholder={t('modals.dailyPlan.searchMember')} />
			<CommandList className="max-h-60">
				<CommandEmpty>{t('modals.dailyPlan.noMemberFound')}</CommandEmpty>
				<CommandGroup>
					{members.map((member) => (
						<MemberRow
							key={member.id}
							member={member}
							isSelected={selectedMember?.id === member.id}
							onSelect={handleMemberClick}
						/>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
