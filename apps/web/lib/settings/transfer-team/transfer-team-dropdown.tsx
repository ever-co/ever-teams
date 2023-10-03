import { useCallback, useEffect, useMemo, useState } from 'react';
import { AutoCompleteDropdown } from 'lib/components';
import { mapTeamMemberItems, TeamMemberItem } from './team-member-item';

import { clsxm } from '@app/utils';
import { IColor, IOrganizationTeamMember } from '@app/interfaces';

export const TransferTeamDropdown = ({
	active,
	members,
	setSelectedMember,
	selectedMember
}: {
	active?: IColor | null;
	members: any;
	setSelectedMember: any;
	selectedMember: IOrganizationTeamMember | undefined;
}) => {
	const items: any = useMemo(() => mapTeamMemberItems(members), [members]);

	const [memberItem, setMemberItem] = useState<TeamMemberItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: TeamMemberItem) => {
			if (item.data) {
				setMemberItem(item);
				setSelectedMember(item.data);
			}
		},
		[setMemberItem, setSelectedMember]
	);

	useEffect(() => {
		if (selectedMember) {
			setMemberItem(items.find((item: any) => item.key === selectedMember.id));
		}
	}, [
		selectedMember,
		active,
		members,
		members?.length,
		setSelectedMember,
		items
	]);

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
