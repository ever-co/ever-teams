import { IEmployee } from '@/app/interfaces';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar';
import React, { FC } from 'react';

const AssigneeUser: FC<{ users: IEmployee[] }> = ({ users }) => {
	const employee = users && users.length > 0 ? users.at(0) : null;
	return (
		<div className="flex items-center gap-1.5 h-full">
			{employee ? (
				<>
					<Avatar className="flex items-center gap-x-2">
						{employee?.user?.imageUrl && (
							<AvatarImage
								src={employee?.user?.imageUrl}
								className="w-10 h-8 rounded-full"
								alt={`${employee.fullName}'s avatar`}
							/>
						)}

						<AvatarFallback>{employee.fullName.substring(0, 2)}</AvatarFallback>
					</Avatar>
					<span className="text-xs font-medium text-indigo-950 dark:text-gray-200">{employee.fullName}</span>
				</>
			) : (
				<span className="text-xs font-medium text-indigo-950 dark:text-gray-200">No user assigned</span>
			)}
		</div>
	);
};

export default AssigneeUser;
