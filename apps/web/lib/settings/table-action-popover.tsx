import { Popover, Transition } from '@headlessui/react';
import { MenuIcon } from 'lib/components/svgs';
import { Fragment } from 'react';
import React from 'react';
import { useDropdownAction } from 'lib/features/team/user-team-card/user-team-card-menu';
import {
	useAuthenticateUser,
	useModal,
	useTeamMemberCard,
	useTMCardTaskEdit,
} from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { ConfirmationModal } from './confirmation-modal';
import { useTranslation } from 'lib/i18n';
import Link from 'next/link';

type Props = {
	member: OT_Member;
	handleEdit: (member: OT_Member) => void;
};

export const TableActionPopover = ({ member, handleEdit }: Props) => {
	// const [isOpen, setIsOpen] = useState(false);

	const { trans } = useTranslation();
	const { user } = useAuthenticateUser();
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const { onRemoveMember } = useDropdownAction({
		edition: taskEdition,
		memberInfo,
	});

	const { isOpen, openModal, closeModal } = useModal();

	const isCurrentUser = user?.employee.id === memberInfo.member?.employeeId;

	// const handleClick = () => {
	// 	setIsOpen(!isOpen);
	// };
	return (
		<Popover className="relative border-none no-underline w-full">
			{() => (
				<>
					<Transition
						as={Fragment}
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<Popover.Panel
							className="z-10 absolute right-0 bg-white dark:bg-[#202023] rounded-2xl w-[7.5rem] flex flex-col pl-5 pr-5 pt-2 pb-2"
							style={{ boxShadow: ' rgba(0, 0, 0, 0.12) -24px 17px 49px' }}
						>
							{/* TODO Dynamic */}
							{/* Edit */}
							<div
								className="flex items-center h-8 w-auto  hover:cursor-pointer"
								onClick={() => {
									handleEdit(member);
								}}
							>
								<span className="text-[#282048] text-xs font-semibold dark:text-white">
									Edit
								</span>
							</div>

							{/* TODO Dynamic */}
							{/* Change Role */}
							{/* <div className="flex items-center h-8 w-auto  hover:cursor-pointer">
								<span className="text-[#282048] text-xs font-semibold dark:text-white">
									Change Role
								</span>
							</div> */}
							<RolePopover />

							{/* TODO Dynamic */}
							{/* Permission */}
							<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
								<Link href={'/permissions'}>
									<span className="text-[#282048] text-xs font-semibold dark:text-white">
										Permission
									</span>
								</Link>
							</div>
							{/* <PermissionModal /> */}

							{/* Delete */}
							<div
								className={`flex items-center h-8 w-auto ${
									!isCurrentUser ? 'hover:cursor-pointer' : ''
								}`}
								onClick={isCurrentUser ? () => undefined : () => openModal()}
							>
								<span
									className={`${
										!isCurrentUser ? 'text-[#E27474]' : ''
									} text-xs font-semibold`}
								>
									Delete
								</span>
							</div>
						</Popover.Panel>
					</Transition>
					<Popover.Button className="outline-none w-full mt-2">
						<MenuIcon className="stroke-[#292D32] dark:stroke-white" />
					</Popover.Button>
					<ConfirmationModal
						open={isOpen}
						close={closeModal}
						title={trans.pages.settings.ARE_YOU_SURE_TO_DELETE_USER}
						loading={false}
						onAction={
							isCurrentUser ? () => undefined : () => onRemoveMember({})
						}
					/>
				</>
			)}
		</Popover>
	);
};

const RolePopover = () => (
	<Popover className="relative border-none no-underline w-full">
		<Transition
			as={Fragment}
			enter="transition ease-out duration-200"
			enterFrom="opacity-0 translate-y-1"
			enterTo="opacity-100 translate-y-0"
			leave="transition ease-in duration-150"
			leaveFrom="opacity-100 translate-y-0"
			leaveTo="opacity-0 translate-y-1"
		>
			<Popover.Panel
				className="z-10 absolute right-0 bg-white dark:bg-[#202023] rounded-2xl w-[9.5rem] flex flex-col pl-5 pr-5 pt-2 pb-2 mt-10 mr-10"
				style={{ boxShadow: ' rgba(0, 0, 0, 0.12) -24px 17px 49px' }}
			>
				<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
					<span className="text-[#282048] text-xs font-semibold dark:text-white">
						Manager (admin)
					</span>
				</div>
				<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
					<span className="text-[#282048] text-xs font-semibold dark:text-white">
						Manager
					</span>
				</div>
				<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
					<span className="text-[#282048] text-xs font-semibold dark:text-white">
						Viewer
					</span>
				</div>
				<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
					<span className="text-[#282048] text-xs font-semibold dark:text-white">
						Member
					</span>
				</div>
			</Popover.Panel>
		</Transition>
		{/* TODO */}
		{/* <Popover.Button className="flex items-center h-8 w-auto hover:cursor-pointer outline-none">
			<span className="text-[#282048] text-xs font-semibold dark:text-white">
				Change Role
			</span>
		</Popover.Button> */}
	</Popover>
);
