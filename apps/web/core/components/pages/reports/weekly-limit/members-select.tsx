import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';

interface IProps {
	onChange: (value: string) => void;
}

/**
 * MembersSelect component provides a dropdown selector for selecting team members.
 *
 * @component
 * @param {IProps} props - The component props.
 * @param {(value: string) => void} props.onChange - Function to handle changes in the selected member.
 *
 * @returns {JSX.Element} A dropdown for selecting a team member.
 *
 */

export function MembersSelect(props: IProps) {
	const { onChange } = props;

	const activeTeam = useAtomValue(activeTeamState);
	const [selected, setSelected] = useState<string>('all');
	const t = useTranslations();
	const handleChange = useCallback(
		(option: string) => {
			setSelected(option);
			onChange(option);
		},
		[onChange]
	);

	return (
		<Select value={selected} onValueChange={handleChange}>
			<SelectTrigger className="h-8 w-48 truncate overflow-hidden text-clip">
				<SelectValue className="truncate" placeholder="Select a member" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{activeTeam?.members?.map((member) => {
						return (
							<SelectItem key={member.id} value={member.employeeId || ''}>
								{member.employee?.fullName || ''}
							</SelectItem>
						);
					})}
					<SelectItem className="capitalize" key={'all'} value={'all'}>
						{t('common.ALL_MEMBERS')}
					</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
