import { useCallback, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import Image from 'next/image';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { useModal } from '@/core/hooks';
import { Modal, Divider } from '@/core/components';
import { useTranslations } from 'next-intl';
import { TaskAssignButton } from '@/core/components/tasks/task-assign-button';
import { clsxm } from '@/core/lib/utils';
import TeamMember from '@/core/components/teams/team-member';
import { Url } from 'next/dist/shared/lib/router/router';
import { IconsCheck, IconsPersonAddRounded, IconsPersonRounded } from '@/core/components/icons';
import { cn } from '../../lib/helpers';
import { TaskAvatars } from '../tasks/task-items';
import { Tooltip } from '../duplicated-components/tooltip';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { TEmployee, TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';

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

	const activeTeam = useAtomValue(activeTeamState);
	const allMembers = activeTeam?.members || [];
	const [assignedMembers, setAssignedMembers] = useState<TEmployee[]>([...(item?.members || [])]);
	const [unassignedMembers, setUnassignedMembers] = useState<TEmployee[]>([]);
	const [validate, setValidate] = useState<boolean>(false);
	const [showInfo, setShowInfo] = useState<boolean>(false);

	const t = useTranslations();

	const onCheckMember = (member: any) => {
		const checkUser = assignedMembers.some((el: TEmployee) => el.id === member.id);
		if (checkUser) {
			const updatedMembers = assignedMembers.filter((el: TEmployee) => el.id != member.id);
			setAssignedMembers(updatedMembers);
			setUnassignedMembers([...unassignedMembers, member]);
		} else {
			setAssignedMembers([...assignedMembers, member]);
			const updatedUnassign = unassignedMembers.filter((el: TEmployee) => el.id != member.id);
			setUnassignedMembers(updatedUnassign);
		}
	};

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

	const onCLickValidate = () => {
		setValidate(!validate);
		closeModal();
	};

	const hasMembers = item?.members?.length > 0;
	const membersList = { assignedMembers, unassignedMembers };

	if (imageLength == undefined) {
		return <Skeleton height={40} width={40} borderRadius={100} className="rounded-full dark:bg-[#353741]" />;
	}

	if ((!hasMembers && item) || hasActiveMembers || assignTaskButtonCall) {
		return (
			<div className="relative min-w-fit">
				{hasInfo.length > 0 && showInfo && (
					<div className="flex w-[200px] justify-center items-center rounded-[3px] text-[12px] absolute left-[-80px] top-[-45px]">
						<div className="relative bg-black text-white rounded-[3px]">
							<span className="text-center p-[6px] z-[5]">{hasInfo}</span>
							<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-t-[10px] border-t-black border-r-[10px] border-r-transparent border-l-[10px] border-l-transparent"></div>
						</div>
					</div>
				)}
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
					<>
						{!hasMembers ? (
							<div
								className="flex items-center justify-center rounded-full border-2 border-dashed border-[#6b7280] cursor-pointer"
								style={{ width: diameter, height: diameter }}
							>
								<IconsPersonRounded
									fill={'#6b7280'}
									className="w-6 h-6 cursor-pointer  stroke-[#c46060]"
									onClick={openModal}
									style={{ width: diameter / 2, height: diameter / 2 }}
									onMouseOver={() => setShowInfo(true)}
									onMouseOut={() => setShowInfo(false)}
								/>
							</div>
						) : (
							<div
								className="flex items-center justify-center rounded-full border-2 border-dashed border-[#6b7280] cursor-pointer"
								style={{ width: diameter, height: diameter }}
							>
								<IconsPersonAddRounded
									fill={'#6b7280'}
									className="w-6 h-6 cursor-pointer  stroke-[#c46060]"
									onClick={openModal}
									style={{ width: diameter / 2, height: diameter / 2 }}
									onMouseOver={() => setShowInfo(true)}
									onMouseOut={() => setShowInfo(false)}
								/>
							</div>
						)}
					</>
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
						<ul className="overflow-auto p-5 py-6">
							{allMembers?.map((member: any) => {
								return (
									<li
										key={member.employee}
										className="rounded-lg border border-transparent cursor-pointer w-100 hover:border-blue-500 hover:border-opacity-50"
									>
										<TeamMember
											member={member}
											item={item}
											onCheckMember={onCheckMember}
											membersList={membersList}
											validate={validate}
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
										className="flex flex-row gap-1 justify-center items-center px-4 py-2 w-28 min-w-0 h-12 text-sm text-white rounded-xl bg-primary dark:bg-primary-light disabled:bg-primary-light disabled:opacity-40"
										onClick={() => {
											onCLickValidate();
										}}
									>
										<IconsCheck fill="#ffffff" />
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
		<div className="flex relative items-center min-w-fit">
			<div className="flex relative items-center">
				{firstArray.map((image, index) => (
					<Link className="!h-10 !w-10" key={index} href={onRedirect(image)}>
						<div
							className={cn(
								'absolute w-full h-full [&:not(:hover)]:!z-0 hover:!z-[5] transition-all hover:scale-110 even:z-[1] odd:z-[2]'
							)}
							style={{ left: index * 30 }}
						>
							<Tooltip
								label={image.alt ?? 'untitled'}
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
							<div className="flex flex-col gap-y-2 m-2">
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
