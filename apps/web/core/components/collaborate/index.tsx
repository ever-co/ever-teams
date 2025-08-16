import { imgTitle } from '@/core/lib/helpers/index';
import { useCollaborative, useModal } from '@/core/hooks';
import { TUser } from '@/core/types/schemas';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/core/components/common/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/core/components/common/dialog';
import { useJitsu } from '@jitsu/jitsu-react';
import { Button } from '@/core/components/common/button';
import { Check } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import stc from 'string-to-color';
import { useTranslations } from 'next-intl';
import { BrushSquareIcon, PhoneUpArrowIcon, UserLinearIcon } from 'assets/svg';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { JitsuAnalytics } from '../analytics/jitsu-analytics';
import { Avatar } from '../duplicated-components/avatar';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

const Collaborate = () => {
	const { onMeetClick, onBoardClick, collaborativeMembers, setCollaborativeMembers } = useCollaborative();
	const { analytics } = useJitsu();
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();

	const { data: user } = useUserQuery();

	const activeTeam = useAtomValue(activeTeamState);
	const members = useMemo(
		() =>
			activeTeam?.members && activeTeam?.members.length
				? activeTeam.members.map((item) => item.employee?.user).filter((item) => item?.id !== user?.id)
				: [],
		[activeTeam, user]
	);
	const selectedMemberIds = useMemo(() => {
		return collaborativeMembers.map((item) => item.id);
	}, [collaborativeMembers]);

	const handleMemberClick = useCallback(
		(member: TUser) => {
			if (collaborativeMembers.includes(member)) {
				return setCollaborativeMembers(
					collaborativeMembers.filter((selectedMember) => selectedMember !== member)
				);
			}

			return setCollaborativeMembers(
				[...members].filter((u: any) => [...collaborativeMembers, member].includes(u)) as TUser[]
			);
		},
		[collaborativeMembers, members, setCollaborativeMembers]
	);

	const handleAction = (actionCallback: () => void) => () => {
		closeModal();
		actionCallback();
	};

	const handleMeetClick = handleAction(onMeetClick);
	const handleBoardClick = handleAction(onBoardClick);

	return (
		<div>
			<JitsuAnalytics user={user} />
			<Dialog open={isOpen} onOpenChange={isOpen ? closeModal : openModal}>
				<DialogTrigger
					onClick={() => {
						analytics.track('click-collaborate', {
							context: {
								email: user?.email,
								name: user?.name,
								tenant: user?.tenant?.name,
								tenantId: user?.tenant?.id
							}
						});

						isOpen ? closeModal() : openModal();
					}}
					className={clsxm(
						'flex flex-row gap-2 justify-center items-center px-4 py-3 text-xs rounded-lg outline-none h-fit',
						'text-sm text-white bg-primary dark:bg-primary-light',
						'disabled:bg-primary-light disabled:opacity-40'
					)}
				>
					<UserLinearIcon className="w-4 h-4 text-white" />
					{t('common.COLLABORATE')}
				</DialogTrigger>
				<DialogContent className="gap-0 p-0 outline-none border-[#0000001A] dark:border-[#26272C]">
					<DialogHeader className="px-4 pt-5 pb-4">
						<DialogTitle>{t('common.COLLABORATE_DIALOG_TITLE')}</DialogTitle>
						<DialogDescription>{t('common.COLLABORATE_DIALOG_SUB_TITLE')}</DialogDescription>
					</DialogHeader>
					<Command className="overflow-hidden rounded-t-none border-t border-[#0000001A] dark:border-[#26272C]">
						<CommandInput placeholder="Search member..." />
						<CommandList>
							<CommandEmpty>{t('common.USER_NOT_FOUND')}</CommandEmpty>
							<ScrollArea className="h-[15rem]">
								<CommandGroup className="p-2">
									{members.map((member: any) => (
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
													backgroundColor: `${stc(member?.name || '')}80`
												}}
											>
												{(member?.image?.thumbUrl ||
													member?.image?.fullUrl ||
													member?.imageUrl) &&
												isValidUrl(
													member?.image?.thumbUrl ||
														member?.image?.fullUrl ||
														member?.imageUrl ||
														''
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
												<p className="text-sm font-medium leading-none">{member?.name}</p>
												<p className="text-xs text-muted-foreground">{member?.email}</p>
											</div>
											{selectedMemberIds.includes(member?.id) ? (
												<Check className="flex ml-auto w-5 h-5 text-primary dark:text-white" />
											) : null}
										</CommandItem>
									))}
								</CommandGroup>
							</ScrollArea>
						</CommandList>
					</Command>
					<DialogFooter className="flex items-center border-t border-[#0000001A] dark:border-[#26272C] p-4 sm:justify-between">
						{collaborativeMembers.length > 0 ? (
							<div className="flex -space-x-3.5 overflow-hidden">
								{collaborativeMembers.map((member) => (
									<div
										key={member?.id}
										className={clsxm(
											'w-[2rem] h-[2rem]',
											'flex justify-center items-center',
											'text-xs rounded-full text-default dark:text-white',
											'text-lg font-normal shadow-md'
										)}
										style={{
											backgroundColor: `${stc(member?.name || '')}80`
										}}
									>
										{(member?.image?.thumbUrl || member?.image?.fullUrl || member?.imageUrl) &&
										isValidUrl(
											member?.image?.thumbUrl || member?.image?.fullUrl || member?.imageUrl || ''
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
								{t('common.COLLABORATE_DIALOG_FOOTER_MESSAGE')}
							</p>
						)}

						<div className="flex space-x-3">
							<Button
								onClick={handleMeetClick}
								className={clsxm('flex w-28 min-w-0 h-12 rounded-xl', 'gap-1 items-center')}
								variant="outline"
							>
								<PhoneUpArrowIcon className="w-4 h-4" />
								{t('common.MEET')}
							</Button>

							<Button
								onClick={handleBoardClick}
								className={clsxm('flex w-28 min-w-0 h-12 rounded-xl', 'gap-1 items-center')}
							>
								<BrushSquareIcon className="w-4 h-4" />
								{t('common.BOARD')}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Collaborate;
