import { clsxm } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';

export type TeamMemberItem = DropdownItem<IOrganizationTeamEmployee & { name: string }>;

export function mapTeamMemberItems(members: (IOrganizationTeamEmployee & { name: string })[]) {
	const items = members.map((member: IOrganizationTeamEmployee & { name: string }) => {
		return {
			key: member.id,
			Label: ({ selected }: { selected: boolean }) => (
				<div className="flex justify-between w-full">
					<div className="max-w-[90%]">
						<TeamMemberItem title={member.name || ''} className={clsxm(selected && ['font-medium'])} />
					</div>
				</div>
			),
			selectedLabel: <TeamMemberItem title={member.name || ''} className="py-2 mb-0" />,
			data: member
		};
	});

	return items;
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
