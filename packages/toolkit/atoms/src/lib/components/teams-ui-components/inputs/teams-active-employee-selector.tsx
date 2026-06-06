import { cn, Select } from '@ever-teams/toolkit-ui';
import { PermissionsEnum } from '@ever-teams/toolkit-types';
import { useEffect, useState } from 'react';
import { useTeamsContext } from '@lib/context/teams-context';
import { useMember } from '@hooks/useMember';

export const TeamsActiveEmployeeSelector = ({
	size,
	label,
	className,
	containerClassName
}: {
	size?: 'default' | 'sm' | 'lg' | null;
	label?: string;
	className?: string;
	containerClassName?: string;
}) => {
	const [selectMemberValues, setSelectMemberValues] = useState<{ label: string; value: string }[]>([]);
	const [isAllowedToChangeEmployee, setIsAllowedToChangeEmployee] = useState<boolean>(false);

	const { selectedEmployee, setSelectedEmployee, userPermissions, authenticatedUser: user } = useTeamsContext();
	const { data: members, loading: membersLoading } = useMember();

	useEffect(() => {
		if (members && members.items.length > 0) {
			setSelectMemberValues(members.items.map((elt) => ({ label: elt.fullName, value: elt.id })));
		} else {
			setSelectMemberValues([]);
		}
	}, [members]);

	useEffect(() => {
		if (userPermissions) {
			const allowed = userPermissions.filter((elt) => elt.permission == PermissionsEnum.CHANGE_SELECTED_EMPLOYEE);
			if (allowed[0]) setIsAllowedToChangeEmployee(true);
		} else {
			setIsAllowedToChangeEmployee(false);
		}
	}, [userPermissions, user]);

	if (!isAllowedToChangeEmployee) {
		return null;
	}

	return (
		<div className={cn(`flex flex-col gap-2}`, containerClassName)}>
			{label && (
				<label htmlFor="employee" className="text-sm text-foreground">
					{label}
				</label>
			)}

			<Select
				loading={membersLoading}
				name="employee"
				placeholder="Select employee"
				values={[{ label: 'All employees', value: 'all' }, ...selectMemberValues]}
				className={className}
				value={selectedEmployee}
				defaultValue={selectedEmployee}
				onValueChange={(value) => {
					setSelectedEmployee(value);
				}}
				disabled={membersLoading || !isAllowedToChangeEmployee}
				size={size}
			/>
		</div>
	);
};
