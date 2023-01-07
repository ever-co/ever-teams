import { useMemo, useState } from 'react';
import { imgTitle } from '@app/helpers';
import { Dropdown, DropdownItem } from 'lib/components';
import { IOrganizationTeamList } from '@app/interfaces';
import clsxm from '@app/utils/clsxm';

type TeamItem = DropdownItem<IOrganizationTeamList>;

function mapTeamItems(teams: IOrganizationTeamList[]) {
	const items = teams.map<TeamItem>((team) => {
		return {
			key: team.id,
			Label: () => (
				<div className="">
					<TeamItem team={team} />
				</div>
			),
			selectedLabel: <TeamItem team={team} className="justify-start py-2" />,
			data: team,
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => <div className="">All</div>,
			disabled: true,
			selectedLabel: <span>All</span>,
		});
	}

	return items;
}

export const TeamsDropDown = () => {
	const items = useMemo(() => mapTeamItems(teams), [teams]);
	const [item, setItem] = useState(items[1] || undefined);

	return (
		<Dropdown
			className="min-w-[230px] max-w-sm"
			buttonClassName="py-0 font-medium"
			value={item}
			onChange={setItem}
			items={items}
		/>
	);
};

function TeamItem({
	team,
	className,
}: {
	team?: IOrganizationTeamList;
	className?: string;
}) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-center space-x-2 text-sm cursor-pointer',
				className
			)}
		>
			<div
				className={clsxm(
					'w-[27px] h-[27px]',
					'flex justify-center items-center',
					'rounded-full text-xs bg-[#F5F5F5] text-default',
					'shadow-md'
				)}
			>
				{team ? imgTitle(team.name) : ''}
			</div>
			<span className="text-normal">{team?.name}</span>
		</div>
	);
}

const teams = [
	{
		id: '05fa2ff8-e9c0-4faf-8642-596f01f2daff',
		createdAt: '2023-01-07T02:45:31.000Z',
		updatedAt: '2023-01-07T02:45:31.000Z',
		tenantId: '694e66ca-6659-4665-b362-72939a29cc50',
		organizationId: 'cceb8bb8-f4a2-4af4-b99d-1c595b16fa06',
		name: 'Team Name',
		prefix: 'TEA',
		createdById: 'a00f7649-77e9-442a-adfe-5cdf22e87023',
		members: [
			{
				id: '89061034-dd9c-4cc3-b0c1-16a187ab896e',
				createdAt: '2023-01-07T02:45:31.000Z',
				updatedAt: '2023-01-07T02:45:31.000Z',
				tenantId: '694e66ca-6659-4665-b362-72939a29cc50',
				organizationId: 'cceb8bb8-f4a2-4af4-b99d-1c595b16fa06',
				organizationTeamId: '05fa2ff8-e9c0-4faf-8642-596f01f2daff',
				employeeId: '54128390-8ea8-47f6-b536-55040122b350',
				roleId: 'ee9ffbf2-eeaf-4799-9cea-a1488048fac6',
				role: {
					id: 'ee9ffbf2-eeaf-4799-9cea-a1488048fac6',
					createdAt: '2023-01-07T02:45:29.000Z',
					updatedAt: '2023-01-07T02:45:29.000Z',
					tenantId: '694e66ca-6659-4665-b362-72939a29cc50',
					name: 'MANAGER',
					isSystem: false,
				},
				employee: {
					id: '54128390-8ea8-47f6-b536-55040122b350',
					createdAt: '2023-01-07T02:45:31.000Z',
					updatedAt: '2023-01-07T02:45:31.000Z',
					tenantId: '694e66ca-6659-4665-b362-72939a29cc50',
					organizationId: 'cceb8bb8-f4a2-4af4-b99d-1c595b16fa06',
					valueDate: null,
					isActive: true,
					short_description: null,
					description: null,
					startedWorkOn: '2023-01-07T02:45:31.073Z',
					endWork: null,
					payPeriod: null,
					billRateValue: null,
					billRateCurrency: null,
					reWeeklyLimit: null,
					offerDate: null,
					acceptDate: null,
					rejectDate: null,
					employeeLevel: null,
					anonymousBonus: null,
					averageIncome: null,
					averageBonus: null,
					totalWorkHours: null,
					averageExpenses: null,
					show_anonymous_bonus: null,
					show_average_bonus: null,
					show_average_expenses: null,
					show_average_income: null,
					show_billrate: null,
					show_payperiod: null,
					show_start_work_on: null,
					isJobSearchActive: null,
					linkedInUrl: null,
					facebookUrl: null,
					instagramUrl: null,
					twitterUrl: null,
					githubUrl: null,
					gitlabUrl: null,
					upworkUrl: null,
					stackoverflowUrl: null,
					isVerified: null,
					isVetted: null,
					totalJobs: null,
					jobSuccess: null,
					profile_link: null,
					isTrackingEnabled: true,
					deletedAt: null,
					userId: 'a00f7649-77e9-442a-adfe-5cdf22e87023',
					contactId: null,
					organizationPositionId: null,
					user: {
						id: 'a00f7649-77e9-442a-adfe-5cdf22e87023',
						createdAt: '2023-01-07T02:45:28.000Z',
						updatedAt: '2023-01-07T02:45:30.000Z',
						tenantId: '694e66ca-6659-4665-b362-72939a29cc50',
						thirdPartyId: null,
						firstName: 'Paradoxe',
						lastName: 'Ngwasi',
						email: 'paradoxngwasi@gmail.com',
						username: null,
						imageUrl: 'https://dummyimage.com/330x300/8b72ff/ffffff.jpg&text=P',
						preferredLanguage: 'en',
						preferredComponentLayout: 'TABLE',
						isActive: true,
						roleId: '27d7d338-5a9a-483c-8bdc-01b3de56b1d8',
						name: 'Paradoxe Ngwasi',
						employeeId: null,
					},
					fullName: 'Paradoxe Ngwasi',
					isDeleted: false,
				},
			},
		],
	},
] as unknown as IOrganizationTeamList[];
