import { useCallback, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/core/components/common/skeleton';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { useModal, useUpdateTask } from '@/core/hooks';
import { Modal, Divider, SpinnerLoader } from '@/core/components';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { TaskAssignButton } from '@/core/components/tasks/task-assign-button';
import { clsxm } from '@/core/lib/utils';
import TeamMember from '@/core/components/teams/team-member';
import { Url } from 'next/dist/shared/lib/router/router';
import { Check, IconsPersonAddRounded, IconsPersonRounded } from '@/core/components/icons';
import { cn } from '../../lib/helpers';
import { TaskAvatars } from '../tasks/task-items';
import { Tooltip } from '../duplicated-components/tooltip';
import { Button } from '../duplicated-components/_button';
import {
	Tooltip as ShadcnTooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/core/components/common/tooltip';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { TEmployee, TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

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

const DEFAULT_AVATAR_SIZE_CLASS = '!h-10 !w-10';

function avatarSizeStyleOf(avatarSize: number | undefined) {
	if (!avatarSize) {
		return undefined;
	}
	return { width: avatarSize, height: avatarSize };
}

function defaultAvatarSizeClassOf(avatarSize: number | undefined) {
	if (avatarSize) {
		return undefined;
	}
	return DEFAULT_AVATAR_SIZE_CLASS;
}

/** Smaller faces overlap by less, so each one still reads as a face. */
function avatarOverlapClassOf(avatarSize: number | undefined) {
	if (avatarSize) {
		return '-space-x-1.5';
	}
	return '-space-x-3';
}

function moreOverlapClassOf(avatarSize: number | undefined) {
	if (avatarSize) {
		return '-ml-1.5 text-[10px]';
	}
	return '-ml-3';
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
	onAvatarClickRedirectTo = 'profile',
	avatarSize
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
	/** The faces' size in pixels; without it they keep the 40px of every existing screen. */
	avatarSize?: number;
}) {
	// Split the array into two arrays based on the display number
	const firstArray = images?.slice(0, displayImageCount);
	const secondArray = images?.slice(displayImageCount);
	const isMoreThanDisplay = images?.length > displayImageCount;
	const imageLength = images?.length;
	const { isOpen, openModal, closeModal } = useModal();

	const activeTeam = useAtomValue(activeTeamState);
	const allMembers = useMemo(() => activeTeam?.members || [], [activeTeam]);
	const [assignedMembers, setAssignedMembers] = useState<TEmployee[]>([...(item?.members || [])]);
	const [unassignedMembers, setUnassignedMembers] = useState<TEmployee[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { updateTask, updateLoading } = useUpdateTask();

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

		const memberNameOf = (member: TEmployee): string => {
			const name = member.fullName || member.user?.name;
			if (name) {
				return name;
			}
			return t('common.UNKNOWN');
		};

		const formatMemberNames = (members: TEmployee[], maxDisplay = 2): string => {
			const names = members.map(memberNameOf);
			if (names.length <= maxDisplay) {
				return names.join(', ');
			}
			const displayed = names.slice(0, maxDisplay).join(', ');
			const remaining = names.length - maxDisplay;
			return t('toasts.tasks.ASSIGNEES_NAMES_AND_OTHERS', { names: displayed, count: remaining });
		};

		try {
			await updateTask({
				...item,
				members: assignedMembers
			});

			const changes: string[] = [];

			if (addedMembers.length > 0) {
				const addedNames = formatMemberNames(addedMembers);
				changes.push(t('toasts.tasks.ASSIGNEES_ADDED', { names: addedNames }));
			}

			if (removedMembers.length > 0) {
				const removedNames = formatMemberNames(removedMembers);
				changes.push(t('toasts.tasks.ASSIGNEES_REMOVED', { names: removedNames }));
			}

			if (changes.length > 0) {
				toast.success(t('toasts.tasks.ASSIGNEES_UPDATED'), {
					description: changes.join(' · ')
				});
			}

			closeModal();
		} catch (error) {
			console.error('Error updating task members:', error);
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.ASSIGNEES_NOT_SAVED'), { description: t(reasonKey) });
		} finally {
			setIsSubmitting(false);
		}
	}, [closeModal, updateTask, item, assignedMembers, isLoading, t]);

	const hasMembers = item?.members?.length > 0;

	if (imageLength === undefined) {
		return <Skeleton className="size-10 rounded-full" />;
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
										className="flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 cursor-pointer bg-transparent text-muted-foreground outline-none transition-colors hover:border-muted-foreground/70 hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
										style={{ width: diameter, height: diameter }}
										onClick={openModal}
										aria-label={t('profile.rows.ASSIGN_THIS_TASK')}
									>
										<IconsPersonRounded
											className="w-6 h-6"
											style={{ width: diameter / 2, height: diameter / 2 }}
										/>
									</button>
								) : (
									<button
										type="button"
										className="flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 cursor-pointer bg-transparent text-muted-foreground outline-none transition-colors hover:border-muted-foreground/70 hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
										style={{ width: diameter, height: diameter }}
										onClick={openModal}
										aria-label={t('profile.rows.ASSIGN_TO_MORE_PEOPLE')}
									>
										<IconsPersonAddRounded
											className="w-6 h-6"
											style={{ width: diameter / 2, height: diameter / 2 }}
										/>
									</button>
								)}
							</TooltipTrigger>
							{hasInfo.length > 0 && <TooltipContent side="top">{hasInfo}</TooltipContent>}
						</ShadcnTooltip>
					</TooltipProvider>
				)}

				<div>
					<Modal
						isOpen={isOpen}
						closeModal={closeModal}
						title={t('common.SELECT_TEAM_MEMBER')}
						className="py-5 w-full md:min-w-[20vw] md:max-w-fit h-[45vh] justify-start"
					>
						<Divider className="mt-4" />
						<ul className="p-5 py-6 overflow-auto">
							{allMembers?.map((member: TOrganizationTeamEmployee) => {
								return (
									<li
										key={member.id}
										className="rounded-lg cursor-pointer w-100 transition-colors hover:bg-foreground/5"
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
									<Button
										size="lg"
										className="min-w-28"
										disabled={isLoading}
										onClick={() => {
											onConfirm();
										}}
									>
										{isLoading && <SpinnerLoader size={20} variant="light" />}
										{!isLoading && <Check />}
										{t('common.CONFIRM')}
									</Button>
								</div>
							</div>
						</div>
					</Modal>
				</div>
			</div>
		);
	}
	const avatarStyle = avatarSizeStyleOf(avatarSize);
	const avatarSizeClassName = defaultAvatarSizeClassOf(avatarSize);
	const overlapClassName = avatarOverlapClassOf(avatarSize);

	return (
		<div className="relative flex items-center min-w-fit">
			<div className={cn('relative flex items-center', overlapClassName)}>
				{firstArray.map((image, index) => (
					<Link className={avatarSizeClassName} style={avatarStyle} key={index} href={onRedirect(image)}>
						<div className={cn('w-full h-full [&:not(:hover)]:!z-0 hover:!z-[5] even:z-[1] odd:z-[2]')}>
							<Tooltip
								label={image.alt ?? 'avatar'}
								labelClassName={cn(!image.alt && 'text-muted-foreground')}
								className="absolute hover:!z-[1]"
								placement="top"
							>
								<Image
									src={image.url}
									alt={`${image.alt} avatar`}
									width={80}
									height={80}
									className={cn('rounded-full ring-2 ring-card', avatarSizeClassName)}
									style={avatarStyle}
								/>
							</Tooltip>
						</div>
					</Link>
				))}
			</div>
			{isMoreThanDisplay && (
				<Popover>
					<PopoverTrigger asChild>
						<div
							style={avatarStyle}
							className={cn(
								'relative z-[6] flex cursor-pointer flex-row items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground ring-2 ring-card',
								avatarSizeClassName,
								moreOverlapClassOf(avatarSize)
							)}
						>
							{secondArray.length < 100 ? secondArray.length : 99}+
						</div>
					</PopoverTrigger>
					<PopoverContent className="px-0 py-2">
						<ScrollArea className="h-40">
							<div className="flex flex-col m-2 gap-y-2">
								{secondArray.map((image: ImageOverlapperProps, index: number) => {
									return (
										<Link
											href={onRedirect(image)}
											className="relative rounded-md p-1 transition-colors hover:bg-foreground/5"
											key={index}
										>
											<div className="flex items-center">
												<Image
													src={image.url}
													alt={`${image.alt} avatar`}
													width={80}
													height={80}
													className="!h-10 !w-10 rounded-full hairline-ring ring-border"
												/>
												<p className="ml-2 text-sm">{image.alt}</p>
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
