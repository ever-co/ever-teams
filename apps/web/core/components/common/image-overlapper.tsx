import { Divider, Modal, SpinnerLoader } from '@/core/components';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import {
	Tooltip as ShadcnTooltip,
	TooltipArrow,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/core/components/common/tooltip';
import { IconsCheck, IconsPersonAddRounded, IconsPersonRounded } from '@/core/components/icons';
import { TaskAssignButton } from '@/core/components/tasks/task-assign-button';
import TeamMember from '@/core/components/teams/team-member';
import { useModal, useTeamTasks } from '@/core/hooks';
import { useCurrentTeam } from '@/core/hooks/organizations/teams/use-current-team';
import { clsxm } from '@/core/lib/utils';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { TEmployee, TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useTranslations } from 'next-intl';
import { Url } from 'next/dist/shared/lib/router/router';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import { toast } from 'sonner';
import { cn } from '../../lib/helpers';
import { Tooltip } from '../duplicated-components/tooltip';
import { TaskAvatars } from '../tasks/task-items';

export interface ImageOverlapperProps {
	id: string;
	url: string;
	alt: string;
}

interface ArrowDataProps {
	activeTaskStatus: ITimerStatus | null | undefined;
	disabled: boolean;
	task: TTask;
	className: string | undefined;
	iconClassName: string | undefined;
}

export default function ImageOverlapper({
	images,
	radius = 20,
	displayImageCount = 4,
	item = null,
	diameter = 34,
	iconType = false,
	arrowData = null,
	hasActiveMembers = false,
	assignTaskButtonCall = false,
	hasInfo = '',
	onAvatarClickRedirectTo = 'profile'
}: {
	images: ImageOverlapperProps[];
	radius?: number;
	displayImageCount?: number;
	item?: any;
	diameter?: number;
	iconType?: boolean;
	arrowData?: ArrowDataProps | null;
	hasActiveMembers?: boolean;
	assignTaskButtonCall?: boolean;
	hasInfo?: string;
	onAvatarClickRedirectTo?: 'kanbanTasks' | 'profile';
}) {
	// Split the array into two arrays based on the display number
	const firstArray = images?.slice(0, displayImageCount);
	const secondArray = images?.slice(displayImageCount);
	const isMoreThanDisplay = images?.length > displayImageCount;
	const imageLength = images?.length;
	const { isOpen, openModal, closeModal } = useModal();

	const activeTeam = useCurrentTeam();
	const allMembers = useMemo(() => activeTeam?.members || [], [activeTeam]);
	const [assignedMembers, setAssignedMembers] = useState<TEmployee[]>([...(item?.members || [])]);
	const [unassignedMembers, setUnassignedMembers] = useState<TEmployee[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { updateTask, updateLoading } = useTeamTasks();

	// Combine local submitting state with React Query mutation pending state
	const isLoading = isSubmitting || updateLoading;

	const t = useTranslations();

	const handleMemberClick = useCallback(
		(member: TEmployee) => {
			const checkUser = assignedMembers.some((el: TEmployee) => el.id === member.id);
			if (checkUser) {
				const updatedMembers = assignedMembers.filter((el: TEmployee) => el.id !== member.id);
				setAssignedMembers(updatedMembers);
				setUnassignedMembers([...unassignedMembers, member]);
			} else {
				setAssignedMembers([...assignedMembers, member]);
				const updatedUnassign = unassignedMembers.filter((el: TEmployee) => el.id !== member.id);
				setUnassignedMembers(updatedUnassign);
			}
		},
		[assignedMembers, unassignedMembers]
	);

	const onRedirect = useCallback(
		(image: ImageOverlapperProps): Url => {
			switch (onAvatarClickRedirectTo) {
				case 'kanbanTasks':
					return {
						pathname: '/kanban',
						query: {
							employee:
								activeTeam?.members?.find((el) => el.employee?.userId === image.id)?.employee
									?.fullName || ''
						}
					};
				case 'profile':
					return { pathname: `/profile/${image.id}`, query: { name: image.alt } };
				default:
					return {};
			}
		},
		[activeTeam?.members, onAvatarClickRedirectTo]
	);

	const onConfirm = useCallback(async () => {
		if (isLoading) return;
		setIsSubmitting(true);

		// Calculate added and removed members for toast message
		const originalMemberIds = new Set((item?.members || []).map((m: TEmployee) => m.id));
		const newMemberIds = new Set(assignedMembers.map((m) => m.id));

		const addedMembers = assignedMembers.filter((m) => !originalMemberIds.has(m.id));
		const removedMembers = (item?.members || []).filter((m: TEmployee) => !newMemberIds.has(m.id));

		// Helper to format member names with "and X others" for better UX
		const formatMemberNames = (members: TEmployee[], maxDisplay = 2): string => {
			const names = members.map((m) => m.fullName || m.user?.name || 'Unknown');
			if (names.length <= maxDisplay) {
				return names.join(', ');
			}
			const displayed = names.slice(0, maxDisplay).join(', ');
			const remaining = names.length - maxDisplay;
			return `${displayed} ${t('common.AND_X_OTHERS', { count: remaining })}`;
		};

		try {
			await updateTask({
				...item,
				members: assignedMembers
			});

			// Build descriptive toast message
			const messages: string[] = [];

			if (addedMembers.length > 0) {
				messages.push(`${t('common.ADDED')}: ${formatMemberNames(addedMembers)}`);
			}

			if (removedMembers.length > 0) {
				messages.push(`${t('common.REMOVED')}: ${formatMemberNames(removedMembers)}`);
			}

			if (messages.length === 0) {
				toast.success(t('task.toastMessages.TASK_ASSIGNED'));
			} else {
				toast.success(t('task.toastMessages.TASK_ASSIGNED'), {
					description: messages.join(' • ')
				});
			}

			closeModal();
		} catch (error) {
			console.error('Error updating task members:', error);
			toast.error(t('task.toastMessages.TASK_ASSIGNMENT_FAILED'));
		} finally {
			setIsSubmitting(false);
		}
	}, [closeModal, updateTask, item, assignedMembers, isLoading, t]);

	const hasMembers = item?.members?.length > 0;

	if (imageLength === undefined) {
		return <Skeleton height={40} width={40} borderRadius={100} className="rounded-full dark:bg-[#353741]" />;
	}

	if ((!hasMembers && item) || hasActiveMembers || assignTaskButtonCall) {
		return (
			<div className="relative min-w-fit">
				{iconType ? (
					<TaskAssignButton
						onClick={openModal}
						disabled={
							arrowData?.activeTaskStatus ? arrowData?.disabled : arrowData?.task.status === 'closed'
						}
						className={clsxm('h-9 w-9', arrowData?.className)}
						iconClassName={arrowData?.iconClassName}
					/>
				) : (
					<TooltipProvider>
						<ShadcnTooltip>
							<TooltipTrigger asChild>
								{!hasMembers ? (
									<button
										type="button"
										className="flex items-center justify-center rounded-full border-2 border-dashed border-[#6b7280] cursor-pointer bg-transparent"
										style={{ width: diameter, height: diameter }}
										onClick={openModal}
										aria-label="Assign task"
									>
										<IconsPersonRounded
											fill={'#6b7280'}
											className="w-6 h-6 stroke-[#c46060]"
											style={{ width: diameter / 2, height: diameter / 2 }}
										/>
									</button>
								) : (
									<button
										type="button"
										className="flex items-center justify-center rounded-full border-2 border-dashed border-[#6b7280] cursor-pointer bg-transparent"
										style={{ width: diameter, height: diameter }}
										onClick={openModal}
										aria-label="Assign task to more people"
									>
										<IconsPersonAddRounded
											fill={'#6b7280'}
											className="w-6 h-6 stroke-[#c46060]"
											style={{ width: diameter / 2, height: diameter / 2 }}
										/>
									</button>
								)}
							</TooltipTrigger>
							{hasInfo.length > 0 && (
								<TooltipContent
									side="top"
									className="bg-black text-white border border-gray-700 dark:bg-white dark:text-gray-900 dark:border-gray-300 font-medium text-xs px-3 py-1.5 rounded-md shadow-lg"
								>
									{hasInfo}
									<TooltipArrow className="fill-black dark:fill-white" />
								</TooltipContent>
							)}
						</ShadcnTooltip>
					</TooltipProvider>
				)}

				<div>
					<Modal
						isOpen={isOpen}
						closeModal={closeModal}
						title={t('common.SELECT_TEAM_MEMBER')}
						className="bg-light--theme-light dark:bg-dark--theme-light py-5 rounded-xl w-full md:min-w-[20vw] md:max-w-fit h-[45vh] justify-start"
						titleClass="font-normal"
					>
						<Divider className="mt-4" />
						<ul className="p-5 py-6 overflow-auto">
							{allMembers?.map((member: TOrganizationTeamEmployee) => {
								return (
									<li
										key={member.id}
										className="border border-transparent rounded-lg cursor-pointer w-100 hover:border-blue-500/50"
									>
										<TeamMember
											member={member}
											onClick={handleMemberClick}
											assigned={assignedMembers.some((el) => el.id === member.employee?.id)}
										/>
									</li>
								);
							})}
						</ul>

						<div className="sticky top-[100%] h-[60px] w-[100%]">
							<Divider className="mt-4" />
							<div className="flex -space-x-3.5 overflow-hidden flex-center mt-[5px] items-center sm:justify-between">
								<TaskAvatars task={{ members: assignedMembers }} limit={3} />
								<div className="flex px-4 h-fit">
									<button
										className="flex flex-row items-center justify-center h-12 min-w-0 gap-3 px-2 py-2 text-sm text-white w-28 rounded-xl bg-primary dark:bg-primary-light disabled:bg-primary-light disabled:opacity-40"
										disabled={isLoading}
										onClick={() => {
											onConfirm();
										}}
									>
										{isLoading ? <SpinnerLoader size={20} /> : <IconsCheck fill="#ffffff" />}
										{t('common.CONFIRM')}
									</button>
								</div>
							</div>
						</div>
					</Modal>
				</div>
			</div>
		);
	}
	return (
		<div className="relative flex items-center min-w-fit">
			<div className="relative flex items-center -space-x-3">
				{firstArray.map((image, index) => (
					<Link className="!h-10 !w-10" key={index} href={onRedirect(image)}>
						<div
							className={cn(
								'w-full h-full [&:not(:hover)]:!z-0 hover:!z-[5] transition-all hover:scale-110 even:z-[1] odd:z-[2]'
							)}
						>
							<Tooltip
								label={image.alt ?? 'avatar'}
								labelClassName={image.alt ? '' : 'text-gray-500'}
								className="absolute hover:!z-[1]"
								placement="top"
							>
								<Image
									src={image.url}
									alt={`${image.alt} avatar`}
									width={80}
									height={80}
									className="!h-10 !w-10 rounded-full border-2 border-white"
								/>
							</Tooltip>
						</div>
					</Link>
				))}
			</div>
			{isMoreThanDisplay && (
				<Popover>
					<PopoverTrigger asChild>
						<div className="flex absolute cursor-pointer rounded-full top-1/2 -translate-y-1/2 left-28 z-[6] flex-row text-sm text-[#282048] dark:text-white font-semibold items-center justify-center !h-10 !w-10 border-2 border-[#0000001a] dark:border-white bg-white dark:bg-[#191A20]">
							{secondArray.length < 100 ? secondArray.length : 99}+
						</div>
					</PopoverTrigger>
					<PopoverContent className="!py-2 !px-0 bg-white dark:bg-dark--theme input-border">
						<ScrollArea className="h-40">
							<div className="flex flex-col m-2 gap-y-2">
								{secondArray.map((image: ImageOverlapperProps, index: number) => {
									return (
										<Link
											href={onRedirect(image)}
											className="relative hover:bg-gray-300 hover:dark:bg-[#24262c] p-1 rounded-md"
											key={index}
										>
											<div className="flex items-center">
												<Image
													src={image.url}
													alt={`${image.alt} avatar`}
													width={80}
													height={80}
													className="!h-10 !w-10 rounded-full border-2 border-white"
												/>
												<p className="ml-2">{image.alt}</p>
											</div>
										</Link>
									);
								})}
							</div>
						</ScrollArea>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
