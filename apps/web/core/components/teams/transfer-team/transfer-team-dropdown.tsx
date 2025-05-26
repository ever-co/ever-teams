import { useCallback, useEffect, useMemo, useState } from 'react';
import { mapTeamMemberItems, TeamMemberItem } from './team-member-item';

import { clsxm } from '@/core/lib/utils';

import { AutoCompleteDropdown } from '../../common/auto-complete-dropdown';
import { IColor } from '../../settings/color-items';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

export const TransferTeamDropdown = ({
	active,
	members,
	setSelectedMember,
	selectedMember
}: {
	active?: IColor | null;
	members: any;
	setSelectedMember: (member: IOrganizationTeamEmployee | undefined) => void;
	selectedMember: IOrganizationTeamEmployee | undefined;
}) => {
	const items: any = useMemo(() => mapTeamMemberItems(members), [members]);

	const [memberItem, setMemberItem] = useState<TeamMemberItem | null>(null);

	const onChangeActiveTeam = useCallback(
		(item: TeamMemberItem | null) => {
			if (item && item.data) {
				setMemberItem(item);
				setSelectedMember(item.data);
			} else if (item === null) {
				setMemberItem(null);
				setSelectedMember(undefined);
			}
		},
		[setMemberItem, setSelectedMember]
	);

	useEffect(() => {
		if (selectedMember) {
			setMemberItem(items.find((item: any) => item.key === selectedMember.id));
		}
	}, [selectedMember, active, members, members?.length, setSelectedMember, items]);

	return (
		<>
			<AutoCompleteDropdown
				className="min-w-[150px]"
				buttonClassName={clsxm('font-normal h-[54px]')}
				value={memberItem}
				onChange={onChangeActiveTeam}
				items={items}
				placeholder={'Please Enter member name'}
			></AutoCompleteDropdown>
		</>
	);
};
