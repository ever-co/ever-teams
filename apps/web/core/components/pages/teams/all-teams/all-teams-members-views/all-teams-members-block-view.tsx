import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';
import UserTeamBlockCard from './users-teams-block/member-block';

interface Employee extends IOrganizationTeamEmployee {
	teams: { team: IOrganizationTeam; activeTaskId?: string | null }[];
}

export default function AllTeamsMembersBlockView({ teams }: { teams: IOrganizationTeam[] }) {
	const employees: Employee[] = teams.flatMap(
		(team) =>
			team.members?.map((member) => ({
				...member,
				teams: [{ team, activeTaskId: member.activeTaskId }]
			})) || []
	);

	const groupedEmployees: Record<string, Employee> = employees.reduce(
		(acc, employee) => {
			if (employee.employeeId && !acc[employee.employeeId]) {
				acc[employee.employeeId] = { ...employee, teams: [] };
			}
			if (employee.employeeId && acc[employee.employeeId]) {
				acc[employee.employeeId].teams.push(...employee.teams);
			}
			return acc;
		},
		{} as Record<string, Employee>
	);

	const employeesArray: Employee[] = Object.values(groupedEmployees);

	return (
		<>
			{employeesArray.length > 0 ? (
				<div className="flex w-full flex-wrap items-start justify-center">
					{employeesArray.map((employee) => (
						<div className="px-2" key={employee.id}>
							<UserTeamBlockCard key={employee.id} member={employee} />
						</div>
					))}
				</div>
			) : (
				<div className="text-center font-medium w-full">There is no member for filtered value</div>
			)}
		</>
	);
}
