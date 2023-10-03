import { imgTitle } from '@app/helpers';
import {
	useAuthenticateUser,
	useCollaborative,
	useOrganizationTeams
} from '@app/hooks';
import { IUser } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@components/ui/dialog';
import { Avatar } from 'lib/components';
import { Button } from 'lib/components/button';
import {
	BrushSquareLinearIcon,
	CallOutGoingLinearIcon,
	Profile2UserLinearIcon
} from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { Check } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import stc from 'string-to-color';
import { JitsuAnalytics } from '../../../lib/components/services/jitsu-analytics';
import { useJitsu } from '@jitsu/jitsu-react';

const Collaborate = () => {
	const {
		onMeetClick,
		onBoardClick,
		collaborativeMembers,
		setCollaborativeMembers
	} = useCollaborative();
	const { analytics } = useJitsu();
	const { trans } = useTranslation();

	const { user } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const members: IUser[] = useMemo(
		() =>
			activeTeam?.members && activeTeam?.members.length
				? activeTeam.members
						.map((item) => item.employee.user as IUser)
						.filter((item) => item.id !== user?.id)
				: [],
		[activeTeam, user]
	);
	const selectedMemberIds = useMemo(() => {
		return collaborativeMembers.map((item) => item.id);
	}, [collaborativeMembers]);

	const handleMemberClick = useCallback(
		(member: IUser) => {
			if (collaborativeMembers.includes(member)) {
				return setCollaborativeMembers(
					collaborativeMembers.filter(
						(selectedMember) => selectedMember !== member
					)
				);
			}

			return setCollaborativeMembers(
				[...members].filter((u) =>
					[...collaborativeMembers, member].includes(u)
				)
			);
		},
		[collaborativeMembers, members, setCollaborativeMembers]
	);

	return (
		<div>
			<JitsuAnalytics user={user} />
			<Dialog>
				<DialogTrigger
					onClick={() =>
						analytics.track('click-collaborate', {
							context: {
								email: user?.email,
								name: user?.name,
								tenant: user?.tenant?.name,
								tenantId: user?.tenant?.id
							}
						})
					}
					className={clsxm(
						'flex flex-row items-center justify-center py-3.5 px-4 gap-3 rounded-xl outline-none',
						'bg-primary dark:bg-primary-light text-white text-sm',
						'disabled:bg-primary-light disabled:opacity-40'
					)}
				>
					<Profile2UserLinearIcon className="w-4 h-4 stroke-white dark:stroke-light--theme-light" />
					{trans.common.COLLABORATE}
				</DialogTrigger>
				<DialogContent className="gap-0 p-0 outline-none border-[#0000001A] dark:border-[#26272C]">
					<DialogHeader className="px-4 pb-4 pt-5">
						<DialogTitle>{trans.common.COLLABORATE_DIALOG_TITLE}</DialogTitle>
						<DialogDescription>
							{trans.common.COLLABORATE_DIALOG_SUB_TITLE}
						</DialogDescription>
					</DialogHeader>
					<Command className="overflow-hidden rounded-t-none border-t border-[#0000001A] dark:border-[#26272C]">
						<CommandInput placeholder="Search member..." />
						<CommandList>
							<CommandEmpty>No users found.</CommandEmpty>
							<CommandGroup className="p-2">
								{members.map((member) => (
									<CommandItem
										key={member.id}
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
												backgroundColor: `${stc(member?.name || '')}80`
											}}
										>
											{(member?.image?.thumbUrl ||
												member?.image?.fullUrl ||
												member?.imageUrl) &&
											isValidUrl(
												member?.image?.thumbUrl ||
													member?.image?.fullUrl ||
													member?.imageUrl
											) ? (
												<Avatar
													size={36}
													className="relative cursor-pointer dark:border-[0.25rem] dark:border-[#26272C]"
													imageUrl={
														member?.image?.thumbUrl ||
														member?.image?.fullUrl ||
														member?.imageUrl
													}
													alt="Team Avatar"
													imageTitle={member?.name || ''}
												></Avatar>
											) : member?.name ? (
												imgTitle(member?.name || ' ').charAt(0)
											) : (
												''
											)}
										</div>

										<div className="ml-2">
											<p className="text-sm font-medium leading-none">
												{member?.name}
											</p>
											<p className="text-xs text-muted-foreground">
												{member?.email}
											</p>
										</div>
										{selectedMemberIds.includes(member.id) ? (
											<Check className="ml-auto flex h-5 w-5 text-primary dark:text-white" />
										) : null}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
					<DialogFooter className="flex items-center border-t border-[#0000001A] dark:border-[#26272C] p-4 sm:justify-between">
						{collaborativeMembers.length > 0 ? (
							<div className="flex -space-x-3.5 overflow-hidden">
								{collaborativeMembers.map((member) => (
									<div
										key={member.id}
										className={clsxm(
											'w-[2rem] h-[2rem]',
											'flex justify-center items-center',
											'rounded-full text-xs text-default dark:text-white',
											'shadow-md text-lg font-normal'
										)}
										style={{
											backgroundColor: `${stc(member?.name || '')}80`
										}}
									>
										{(member?.image?.thumbUrl ||
											member?.image?.fullUrl ||
											member?.imageUrl) &&
										isValidUrl(
											member?.image?.thumbUrl ||
												member?.image?.fullUrl ||
												member?.imageUrl
										) ? (
											<Avatar
												size={32}
												className="relative cursor-pointer dark:border-[0.25rem] dark:border-[#26272C]"
												imageUrl={
													member?.image?.thumbUrl ||
													member?.image?.fullUrl ||
													member?.imageUrl
												}
												alt="Team Avatar"
												imageTitle={member?.name || ''}
											></Avatar>
										) : member?.name ? (
											imgTitle(member?.name || ' ').charAt(0)
										) : (
											''
										)}
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								{trans.common.COLLABORATE_DIALOG_FOOTER_MESSAGE}
							</p>
						)}

						<div className="flex space-x-3">
							<Button
								onClick={onMeetClick}
								className={clsxm(
									'rounded-xl flex min-w-0 w-28 h-12',
									'gap-1 items-center'
								)}
								variant="outline"
							>
								<CallOutGoingLinearIcon className="w-4 h-4 stroke-primary dark:stroke-light--theme-light" />
								{trans.common.MEET}
							</Button>

							<Button
								onClick={onBoardClick}
								className={clsxm(
									'rounded-xl flex min-w-0 w-28 h-12',
									'gap-1 items-center'
								)}
							>
								<BrushSquareLinearIcon className="w-4 h-4 stroke-white dark:stroke-light--theme-light" />
								{trans.common.BOARD}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Collaborate;
