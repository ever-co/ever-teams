import UserTeamBlockCard from './users-teams-block/member-block';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TOrganizationTeam } from '@/core/types/schemas/team/team.schema';

interface Employee extends TOrganizationTeamEmployee {
	teams: { team: TOrganizationTeam; activeTaskId?: string | null }[];
}

export default function AllTeamsMembersBlockView({ teams }: { teams: TOrganizationTeam[] }) {
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
				<div className="flex flex-wrap items-start justify-center w-full">
					{employeesArray.map((employee) => (
						<div className="px-2" key={employee.id}>
							<UserTeamBlockCard key={employee.id} member={employee} />
						</div>
					))}
				</div>
			) : (
				<div className="w-full font-medium text-center">There is no member for filtered value</div>
			)}
		</>
	);
}
