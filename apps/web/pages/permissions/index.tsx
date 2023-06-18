import { imgTitle } from '@app/helpers';
import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import { usePagination } from '@app/hooks/features/usePagination';
import { OT_Member } from '@app/interfaces';
import { userState } from '@app/stores';
import { clsxm } from '@app/utils';
import NotFound from '@components/pages/404';
import { withAuthentication } from 'lib/app/authenticator';
import {
	Avatar,
	Button,
	Card,
	CommonToggle,
	Container,
	Divider,
	InputField,
	Text,
} from 'lib/components';
import { Paginate } from 'lib/components/pagination';
import { SearchNormalIcon } from 'lib/components/svgs';
import { PermissionDropDown } from 'lib/features/permission/permission-dropdown';
import { useTranslation } from 'lib/i18n';

import { MainLayout } from 'lib/layout';
import moment from 'moment';
import { ChangeEvent, useState } from 'react';

import { useRecoilState } from 'recoil';
import stc from 'string-to-color';

const Permissions = () => {
	const { trans } = useTranslation();
	const { activeTeam, activeTeamManagers } = useOrganizationTeams();

	const [user] = useRecoilState(userState);
	const { isTeamManager } = useIsMemberManager(user);
	const [filterString, setFilterString] = useState<string>('');

	const members =
		activeTeam?.members.filter(
			(member) =>
				member.employee.fullName.toLowerCase().includes(filterString) ||
				member.employee.user?.email.toLowerCase().includes(filterString)
		) || [];

	const {
		total,
		onPageChange,
		itemsPerPage,
		itemOffset,
		endOffset,
		setItemsPerPage,
		currentItems,
	} = usePagination<OT_Member>(members || [], 10);

	if (activeTeamManagers && activeTeamManagers.length && !isTeamManager) {
		return (
			<MainLayout className="items-start">
				<NotFound />
			</MainLayout>
		);
	}

	return (
		<MainLayout className="items-start">
			<Container className="flex">
				<Card
					className="w-[90vw] h-[90vh] min-w-fit flex flex-row gap-8 mb-3"
					shadow="custom"
				>
					<div className="flex flex-col w-[65%] ">
						<Text className="text-2xl font-normal pb-5">
							{trans.pages.settingsTeam.MEMBER_HEADING_TITLE}
						</Text>

						<div className="flex items-center justify-between w-full">
							<div className="w-auto">
								<InputField
									type="text"
									placeholder={trans.pages.settingsTeam.SEARCH_MEMBER}
									className="mb-0 h-11"
									leadingNode={
										<Button
											variant="ghost"
											className="p-0 m-0 ml-[0.9rem] min-w-0"
											type="submit"
										>
											<SearchNormalIcon className="w-[1rem] dark:stroke-[#ffffff] " />
										</Button>
									}
									wrapperClassName={'mb-0'}
									onChange={(e: ChangeEvent<HTMLInputElement>) => {
										setFilterString(
											e.target.value ? e.target.value.toLowerCase() : ''
										);
									}}
								/>
							</div>
							<div className="w-auto">
								<PermissionDropDown />
							</div>
						</div>

						<div className="flex flex-row">
							<div className="w-[30%] text-[#B1AEBC] dark:text-white pt-2 pb-2">
								Name
							</div>
							<div className="w-[30%] text-[#B1AEBC] dark:text-white pt-2 pb-2">
								Email
							</div>
							<div className="w-[15%] text-[#B1AEBC] dark:text-white pt-2 pb-2">
								Roles
							</div>
							<div className="w-[20%] text-[#B1AEBC] dark:text-white pl-9 pt-2 pb-2">
								Date
							</div>
						</div>
						<Divider className="dark:opacity-100" />
						<div className="h-[90%] overflow-y-scroll">
							{currentItems.map((member) => (
								<div className="flex flex-row pt-5 pb-5" key={member.id}>
									<div className="w-[30%] text-sm flex items-center">
										{member.employee.user?.imageId ? (
											<Avatar
												size={33}
												className="relative cursor-pointer"
												imageUrl={
													member.employee.user?.image?.thumbUrl ||
													member.employee.user?.image?.fullUrl ||
													member.employee.user?.imageUrl
												}
												alt="User Avatar"
											/>
										) : member.employee.user?.name ? (
											<div
												className={clsxm(
													'w-[33px] h-[33px]',
													'flex justify-center items-center',
													'rounded-full text-xs text-default dark:text-white',
													'shadow-md font-normal'
												)}
												style={{
													backgroundColor: `${stc(
														member.employee.user?.name || ''
													)}80`,
												}}
											>
												{imgTitle(member.employee.user?.name)}
											</div>
										) : (
											''
										)}
										<div className="flex flex-col gap-1 pl-3">
											<div className="text-sm text-[#282048] dark:text-white">
												{member.employee.fullName || ''}
											</div>
										</div>
									</div>
									<div className="w-[30%] text-sm flex items-center">
										{member.employee.user?.email || ''}
									</div>
									<div className="w-[15%] text-sm flex items-center">
										{member.role?.name || ''}
									</div>
									<div className="w-[25%] text-sm flex items-center pl-9">
										{moment(member.employee.createdAt).format(
											'DD MMM YYYY hh:mm A'
										)}
									</div>
								</div>
							))}
						</div>
						<div className="h-[10%] pr-5">
							<Paginate
								total={total}
								onPageChange={onPageChange}
								pageCount={1} // Set Static to 1 - It will be calculated dynamically in Paginate component
								itemsPerPage={itemsPerPage}
								itemOffset={itemOffset}
								endOffset={endOffset}
								setItemsPerPage={setItemsPerPage}
							/>
						</div>
					</div>

					<Divider type="VERTICAL" />

					<div className="flex flex-col w-[35%] overflow-scroll">
						<Text className="text-2xl font-normal pb-5">
							{trans.common.PERMISSION}
						</Text>

						<div className="overflow-y-scroll">
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									Task Time
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									Estimate issue
									{trans.pages.settingsTeam.TRACK_TIME}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.EPICS_CREATE_CLOSE}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.ISSUE_CREATE_CLOSE}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.ISSUE_ASSIGN_UNASSIGN}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.INVITE_MEMBERS}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.REMOVE_MEMBERS}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.HANDLE_REQUESTS}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.ROLES_POSITIONS_CHANGE}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-[2rem]">
								<Text className="flex-none text-gray-400 flex-grow-0 text-base font-normal md-2 w-1/2">
									{trans.pages.settingsTeam.VIEW_DETAILS}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-full">
									<CommonToggle
										enabledText="Activated"
										disabledText="Deactivated"
									/>
								</div>
							</div>
						</div>
					</div>
				</Card>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(Permissions, {
	displayName: 'PermissionPage',
});
