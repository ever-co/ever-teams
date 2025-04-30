import { useCallback, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/ui/popover';
import Image from 'next/image';
import Link from 'next/link';
import { ITeamTask, ITimerStatus } from '@/core/types/interfaces';
import Skeleton from 'react-loading-skeleton';
import { Tooltip } from './tooltip';
import { ScrollArea } from '@/core/components/ui/scroll-bar';
import { useModal } from '@/core/hooks';
import { Modal, Divider } from '@/core/components';
import { useOrganizationTeams } from '@/core/hooks';
import { useTranslations } from 'next-intl';
import { TaskAssignButton } from '@/core/components/features/task/task-assign-button';
import { clsxm } from '@app/utils';
import { TaskAvatars } from '@/core/components/features';
import TeamMember from '@/core/components/team-member';
import { IEmployee } from '@/core/types/interfaces';
import { Url } from 'next/dist/shared/lib/router/router';
import { IconsCheck, IconsPersonAddRounded, IconsPersonRounded } from '@/icons';

export interface ImageOverlapperProps {
	id: string;
	url: string;
	alt: string;
}

interface ArrowDataProps {
	activeTaskStatus: ITimerStatus | null | undefined;
	disabled: boolean;
	task: ITeamTask;
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
	const widthCalculate = images?.slice(0, 5);
	const secondArray = images?.slice(displayImageCount);
	const isMoreThanDisplay = images?.length > displayImageCount;
	const imageLength = images?.length;
	const { isOpen, openModal, closeModal } = useModal();
	const { activeTeam } = useOrganizationTeams();
	const allMembers = activeTeam?.members || [];
	const [assignedMembers, setAssignedMembers] = useState<IEmployee[]>([...(item?.members || [])]);
	const [unassignedMembers, setUnassignedMembers] = useState<IEmployee[]>([]);
	const [validate, setValidate] = useState<boolean>(false);
	const [showInfo, setShowInfo] = useState<boolean>(false);

	const t = useTranslations();

	const onCheckMember = (member: any) => {
		const checkUser = assignedMembers.some((el: IEmployee) => el.id === member.id);
		if (checkUser) {
			const updatedMembers = assignedMembers.filter((el: IEmployee) => el.id != member.id);
			setAssignedMembers(updatedMembers);
			setUnassignedMembers([...unassignedMembers, member]);
		} else {
			setAssignedMembers([...assignedMembers, member]);
			const updatedUnassign = unassignedMembers.filter((el: IEmployee) => el.id != member.id);
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
							employee: activeTeam?.members.find((el) => el.employee.userId === image.id)?.employee
								.fullName
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
			<div className="relative">
				{hasInfo.length > 0 && showInfo && (
					<div className="flex w-[200px] justify-center items-center rounded-[3px] text-[12px] absolute left-[-80px] top-[-45px]">
						<div className="relative bg-black text-white rounded-[3px]">
							<span className="text-center p-[6px] z-10">{hasInfo}</span>
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
						<ul className="p-5 py-6 overflow-auto">
							{allMembers?.map((member: any) => {
								return (
									<li
										key={member.employee}
										className="border border-transparent rounded-lg cursor-pointer w-100 hover:border-blue-500 hover:border-opacity-50"
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
										className="flex flex-row items-center justify-center h-12 min-w-0 gap-1 px-4 py-2 text-sm text-white bg-primary dark:bg-primary-light disabled:bg-primary-light disabled:opacity-40 rounded-xl w-28"
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
		<div
			style={{
				width:
					imageLength == 1 ? 40 : isMoreThanDisplay ? widthCalculate.length * 33 : widthCalculate.length * 35
			}}
			className="relative "
		>
			{firstArray.map((image, index) => (
				<Link key={index} href={onRedirect(image)}>
					<div
						className="absolute hover:!z-20 transition-all hover:scale-110"
						style={{ zIndex: index + 1, left: index * 30, top: isMoreThanDisplay ? -8 : -16 }}
					>
						<Tooltip
							label={image.alt ?? 'untitled'}
							labelClassName={image.alt ? '' : 'text-gray-500'}
							placement="top"
						>
							<Image
								src={image.url}
								alt={`${image.alt} avatar`}
								width={80}
								height={80}
								style={{ borderRadius: radius }}
								className="!h-10 !w-10 border-2 border-white"
							/>
						</Tooltip>
					</div>
				</Link>
			))}
			{secondArray.length > 0 && (
				<Popover>
					<PopoverTrigger asChild>
						<div
							style={{
								top: isMoreThanDisplay ? -8 : -16,
								borderRadius: radius
							}}
							className="flex absolute left-28 z-[6] flex-row text-sm text-[#282048] dark:text-white font-semibold items-center justify-center !h-10 !w-10 border-2 border-[#0000001a] dark:border-white bg-white dark:bg-[#191A20]"
						>
							{secondArray.length < 100 ? secondArray.length : 99}+
						</div>
					</PopoverTrigger>
					<PopoverContent className="!p-0 bg-white dark:bg-dark--theme input-border">
						<ScrollArea className="h-40 ">
							<div className="flex flex-col m-2 space-y-2">
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
