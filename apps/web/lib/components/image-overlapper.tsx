import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import Image from 'next/image';
import Link from 'next/link';
import { ITeamTask, ITimerStatus } from '@app/interfaces';
import Skeleton from 'react-loading-skeleton';
import { Tooltip } from './tooltip';
import { ScrollArea } from '@components/ui/scroll-bar';
import { CircleIcon } from 'assets/svg';
import { useModal } from '@app/hooks';
import { Modal, Divider } from 'lib/components';
import { useOrganizationTeams } from '@app/hooks';
import { useTranslations } from 'next-intl';
import { TaskAssignButton } from '../../lib/features/task/task-assign-button';
import { clsxm } from '@app/utils';
import { TaskAvatars } from 'lib/features';
import { FaCheck } from "react-icons/fa6";
import TeamMember from 'lib/components/team-member';
import { IEmployee } from '@app/interfaces';

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
	diameter = 40,
	iconType = false,
	arrowData = null,
	hasActiveMembers = false,
	assignTaskButtonCall = false,
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
}) {
	// Split the array into two arrays based on the display number
	const firstArray = images.slice(0, displayImageCount);
	const widthCalculate = images.slice(0, 5);
	const secondArray = images.slice(displayImageCount);
	const isMoreThanDisplay = images.length > displayImageCount;
	const imageLength = images.length;
	const { isOpen, openModal, closeModal } = useModal();
	const { activeTeam } = useOrganizationTeams();
	const allMembers = activeTeam?.members || [];
	const [assignedMembers, setAssignedMembers] = useState<IEmployee[]>([...(item?.members || [])]);
	const [unassignedMembers, setUnassignedMembers] = useState<IEmployee[]>([]);
	const [validate, setValidate] = useState<boolean>(false);

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

	}

	const onCLickValidate = () => {
		setValidate(!validate);
		closeModal();
	}

	const hasMembers = item?.members?.length > 0;
	const membersList = { assignedMembers, unassignedMembers };

	if (imageLength == undefined) {
		return <Skeleton height={40} width={40} borderRadius={100} className="rounded-full dark:bg-[#353741]" />;
	}

	if ((!hasMembers && item) || hasActiveMembers || assignTaskButtonCall) {
		return (
			<div>
				{
					iconType ? (
						<TaskAssignButton
							onClick={openModal}
							disabled={arrowData?.activeTaskStatus ? arrowData?.disabled : arrowData?.task.status === 'closed'}
							className={clsxm('h-9 w-9', arrowData?.className)}
							iconClassName={arrowData?.iconClassName}
						/>

					) : (
						<CircleIcon className="w-6 h-6 cursor-pointer  stroke-[#d3d3d3]" onClick={openModal} style={{ width: diameter, height: diameter }} />
					)
				}

				<div>
					<Modal
						isOpen={isOpen}
						closeModal={closeModal}
						title={t('common.SELECT_TEAM_MEMBER')}
						className="bg-light--theme-light dark:bg-dark--theme-light py-5 rounded-xl w-full md:min-w-[20vw] md:max-w-fit h-[45vh] justify-start"
						titleClass="font-normal"
					>
						<Divider className="mt-4" />
						<ul className="py-6 overflow-auto p-5">
							{allMembers?.map((member: any) => {
								return (
									<li
										key={member.employee}
										className="w-100 border border-transparent hover:border-blue-500 hover:border-opacity-50 rounded-lg cursor-pointer"
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
							<div className='flex -space-x-3.5 overflow-hidden flex-center mt-[5px] items-center sm:justify-between'>
								<TaskAvatars task={{ members: assignedMembers }} limit={3} />
								<div className="flex px-4 h-fit">
									<button
										className="flex-row justify-center py-2 px-4 bg-primary
										dark:bg-primary-light text-white text-sm disabled:bg-primary-light
										 disabled:opacity-40 rounded-xl flex min-w-0 w-28
										  h-12 gap-1 items-center"
										onClick={() => {
											onCLickValidate();
										}}>
										<FaCheck size={17} fill="#ffffff" />
										{"Confirm"}
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
				<Link key={index} href={`/profile/${image.id}?name=${image.alt}`}>
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
					<PopoverTrigger>
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
							<div className="flex flex-col space-y-2 m-2">
								{secondArray.map((image: ImageOverlapperProps, index: number) => {
									return (
										<Link
											href={`/profile/${image.id}?name=${image.alt}`}
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
