import { useTeamMemberCard } from '@app/hooks';
import { IClassName, IOrganizationTeamList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Card } from 'lib/components';
import { useTranslation } from 'lib/i18n';

import { PublicUserInfo } from './user-info';

export function PublicUserTeamCardHeader() {
	const { trans } = useTranslation();
	return (
		<ul className="flex row font-normal justify-between mb-3 mt-16">
			<li>{trans.common.TEAM_MEMBERS}</li>
		</ul>
	);
}

type IUserTeamCard = {
	active?: boolean;
	member?: IOrganizationTeamList['members'][number];
} & IClassName;

export function PublicUserTeamCard({
	className,
	active,
	member,
}: IUserTeamCard) {
	const memberInfo = useTeamMemberCard(member);

	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'relative flex items-center py-3',
				active && ['border-primary-light border-[2px]'],
				className
			)}
		>
			{/* Show user name, email and image */}
			<PublicUserInfo memberInfo={memberInfo} className="w-[330px]" />
		</Card>
	);
}

export function PublicUserTeamCardSkeleton() {
	return (
		<div
			role="status"
			className="p-4 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex justify-between items-center">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-14 h-14 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div>
						<div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"></div>
					</div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-24"></div>
			</div>
		</div>
	);
}

export function PublicInviteUserTeamSkeleton() {
	return (
		<div
			role="status"
			className="p-4 mt-3 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex justify-between items-center">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-24 h-9 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
				</div>
			</div>
		</div>
	);
}
