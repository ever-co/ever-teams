import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { TEmployee } from '@/core/types/schemas/organization/employee.schema';
import { FC } from 'react';
import { useTranslations } from 'next-intl';

const AssigneeUser: FC<{ users?: TEmployee[] | null }> = ({ users }) => {
	const t = useTranslations();
	const employee = users && users.length > 0 ? users.at(0) : null;
	return (
		<div className="flex items-center gap-1.5 h-full" role="group" aria-label="Task assignee">
			{employee && employee.fullName ? (
				<div className="flex items-center gap-2.5">
					<Avatar className="size-6" aria-label={`${employee.fullName}'s avatar`}>
						{employee?.user?.imageUrl && (
							<AvatarImage src={employee.user.imageUrl} alt={`${employee.fullName}'s avatar`} />
						)}

						<AvatarFallback aria-hidden="true">
							{employee.fullName.substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>

					<span className="truncate text-sm font-medium text-foreground">{employee.fullName}</span>
				</div>
			) : (
				<span className="text-sm text-muted-foreground">{t('pages.teamTasks.NO_USER_ASSIGNED')}</span>
			)}
		</div>
	);
};

export default AssigneeUser;
