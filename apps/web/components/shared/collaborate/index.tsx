import { imgTitle } from '@app/helpers';
import { useOrganizationTeams } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
// import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@components/ui/dialog';
import { Avatar } from 'lib/components';
import { Button } from 'lib/components/button';
import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import stc from 'string-to-color';

const Collaborate = () => {
	const { activeTeam } = useOrganizationTeams();
	const members = useMemo(() => activeTeam?.members || [], [activeTeam]);
	const [selectedMembers, setSelectedMembers] = useState<OT_Member[]>([]);

	return (
		<div>
			<Dialog>
				<DialogTrigger
					className={clsxm(
						'flex flex-row items-center justify-center py-3 px-4 gap-3 rounded-lg outline-none',
						'bg-primary dark:bg-primary-light text-white text-sm',
						'disabled:bg-primary-light disabled:opacity-40'
					)}
				>
					Collaborate
				</DialogTrigger>
				<DialogContent className="gap-0 p-0 outline-none">
					<DialogHeader className="px-4 pb-4 pt-5">
						<DialogTitle>New message</DialogTitle>
						<DialogDescription>
							Invite a user to this thread. This will create a new group
							message.
						</DialogDescription>
					</DialogHeader>
					<Command className="overflow-hidden rounded-t-none border-t">
						<CommandInput placeholder="Search user..." />
						<CommandList>
							<CommandEmpty>No users found.</CommandEmpty>
							<CommandGroup className="p-2">
								{members.map((member) => (
									<CommandItem
										key={member.id}
										className="flex items-center px-2"
										onSelect={() => {
											if (selectedMembers.includes(member)) {
												return setSelectedMembers(
													selectedMembers.filter(
														(selectedMember) => selectedMember !== member
													)
												);
											}

											return setSelectedMembers(
												[...members].filter((u) =>
													[...selectedMembers, member].includes(u)
												)
											);
										}}
									>
										{/* <Avatar>
											<AvatarImage
												src={member.employee.user?.image?.fullUrl}
												alt="Image"
											/>
											<AvatarFallback>
												{member.employee.user?.name
													? member.employee.user?.name[0]
													: ''}
											</AvatarFallback>
										</Avatar> */}

										<div
											className={clsxm(
												'w-[2.25rem] h-[2.25rem]',
												'flex justify-center items-center',
												'rounded-full text-xs text-default dark:text-white',
												'shadow-md text-lg font-normal'
											)}
											style={{
												backgroundColor: `${stc(
													member.employee.user?.name || ''
												)}80`,
											}}
										>
											{(member.employee.user?.image?.thumbUrl ||
												member.employee.user?.image?.fullUrl ||
												member.employee.user?.imageUrl) &&
											isValidUrl(
												member.employee.user?.image?.thumbUrl ||
													member.employee.user?.image?.fullUrl ||
													member.employee.user?.imageUrl
											) ? (
												<Avatar
													size={36}
													className="relative cursor-pointer dark:border-[0.25rem] dark:border-[#26272C]"
													imageUrl={
														member.employee.user?.image?.thumbUrl ||
														member.employee.user?.image?.fullUrl ||
														member.employee.user?.imageUrl
													}
													alt="Team Avatar"
													imageTitle={member.employee.user?.name || ''}
												></Avatar>
											) : member.employee.user?.name ? (
												imgTitle(member.employee.user?.name || ' ').charAt(0)
											) : (
												''
											)}
										</div>

										<div className="ml-2">
											<p className="text-sm font-medium leading-none">
												{member.employee.user?.name}
											</p>
											<p className="text-sm text-muted-foreground">
												{member.employee.user?.email}
											</p>
										</div>
										{selectedMembers.includes(member) ? (
											<Check className="ml-auto flex h-5 w-5 text-primary" />
										) : null}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
					<DialogFooter className="flex items-center border-t p-4 sm:justify-between">
						{selectedMembers.length > 0 ? (
							<div className="flex -space-x-2 overflow-hidden">
								{selectedMembers.map((member) => (
									<div
										key={member.id}
										className={clsxm(
											'w-[2.25rem] h-[2.25rem]',
											'flex justify-center items-center',
											'rounded-full text-xs text-default dark:text-white',
											'shadow-md text-lg font-normal'
										)}
										style={{
											backgroundColor: `${stc(
												member.employee.user?.name || ''
											)}80`,
										}}
									>
										{(member.employee.user?.image?.thumbUrl ||
											member.employee.user?.image?.fullUrl ||
											member.employee.user?.imageUrl) &&
										isValidUrl(
											member.employee.user?.image?.thumbUrl ||
												member.employee.user?.image?.fullUrl ||
												member.employee.user?.imageUrl
										) ? (
											<Avatar
												size={36}
												className="relative cursor-pointer dark:border-[0.25rem] dark:border-[#26272C]"
												imageUrl={
													member.employee.user?.image?.thumbUrl ||
													member.employee.user?.image?.fullUrl ||
													member.employee.user?.imageUrl
												}
												alt="Team Avatar"
												imageTitle={member.employee.user?.name || ''}
											></Avatar>
										) : member.employee.user?.name ? (
											imgTitle(member.employee.user?.name || ' ').charAt(0)
										) : (
											''
										)}
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								Select users to add to this thread.
							</p>
						)}
						<Button>Continue</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Collaborate;
