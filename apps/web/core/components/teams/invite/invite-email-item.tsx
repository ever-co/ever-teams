import { clsxm } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { PersonAvatar } from '@/core/components/teams/people-avatars';

export type InviteEmailItem = DropdownItem<IInviteEmail>;
export interface IInviteEmail {
	title: string;
	name: string;
}

export function mapTeamMemberItems(members: IInviteEmail[]) {
	const items: InviteEmailItem[] = members.map((member: IInviteEmail) => {
		return {
			key: member.title,
			Label: ({ active, selected }) => (
				<InviteEmailOption member={member} isActive={Boolean(active)} isSelected={Boolean(selected)} />
			),
			selectedLabel: <TeamMemberItem title={member.title} className="py-2 mb-0" />,
			data: member
		};
	});

	return items;
}

function InviteEmailOption({
	member,
	isActive,
	isSelected
}: Readonly<{ member: IInviteEmail; isActive: boolean; isSelected: boolean }>) {
	const displayName = member.name || member.title;
	const hasName = Boolean(member.name);
	return (
		<div
			className={clsxm(
				'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5',
				isActive && 'bg-foreground/5'
			)}
		>
			<PersonAvatar person={{ id: member.title, name: displayName, imageUrl: null }} className="ring-0" />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-[13px] font-medium text-foreground">{displayName}</span>
				{hasName && <span className="truncate text-xs text-muted-foreground">{member.title}</span>}
			</span>
			{isSelected && <SelectedMark />}
		</div>
	);
}

export function TeamMemberItem({ title, className }: { title?: string; className?: string; disabled?: boolean }) {
	return (
		<div
			title={title}
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm',
				'cursor-pointer mb-4 max-w-full',
				className
			)}
		>
			<span className={clsxm('text-normal', 'whitespace-nowrap text-ellipsis overflow-hidden')}>{title}</span>
		</div>
	);
}
