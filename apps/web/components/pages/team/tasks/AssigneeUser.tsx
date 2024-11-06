import { IEmployee } from '@/app/interfaces';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar';
import { FC } from 'react';

const AssigneeUser: FC<{ users: IEmployee[] }> = ({ users }) => {
	const employee = users && users.length > 0 ? users.at(0) : null;
	return (
		<div className="flex items-center gap-1.5 h-full" role="group" aria-label="Task assignee">
			{employee ? (
				<div className="flex items-center gap-2.5">
					<Avatar className="w-6 h-6 rounded-full" aria-label={`${employee.fullName}'s avatar`}>
						{employee?.user?.imageUrl && (
							<AvatarImage src={employee?.user?.imageUrl} alt={`${employee.fullName}'s avatar`} />
						)}

						<AvatarFallback aria-hidden="true">
							{employee.fullName.substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>

					<span className="text-xs font-medium text-indigo-950 dark:text-gray-200">{employee.fullName}</span>
				</div>
			) : (
				<span className="text-xs font-medium text-indigo-950 dark:text-gray-200">No user assigned</span>
			)}
		</div>
	);
};

export default AssigneeUser;
