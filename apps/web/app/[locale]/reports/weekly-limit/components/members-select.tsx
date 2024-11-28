import { useOrganizationTeams } from '@/app/hooks';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { useCallback, useState } from 'react';

interface IProps {
	onChange: (value: string) => void;
}

export function MembersSelect(props: IProps) {
	const { onChange } = props;
	const { activeTeam } = useOrganizationTeams();
	const [selected, setSelected] = useState<string>('all');

	const handleChange = useCallback(
		(option: string) => {
			setSelected(option);
			onChange(option);
		},
		[onChange]
	);

	return (
		<Select value={selected} onValueChange={handleChange}>
			<SelectTrigger className="w-36 overflow-hidden  h-[2.2rem]  text-clip border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
				<SelectValue placeholder="Select a member" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{activeTeam?.members.map((member) => {
						return (
							<SelectItem key={member.id} value={member.id}>
								{member.employee.fullName}
							</SelectItem>
						);
					})}
					<SelectItem className=" capitalize" key={'all'} value={'all'}>
						{'All members'}
					</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
