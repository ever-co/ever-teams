import UserTeamBlockCard from './users-teams-block/member-block';
import { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';

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
	const hasEmployees = employeesArray.length > 0;

	return (
		<>
			{hasEmployees && (
				<div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
					{employeesArray.map((employee) => (
						<UserTeamBlockCard key={employee.id} member={employee} />
					))}
				</div>
			)}
			{!hasEmployees && (
				<div className="w-full rounded-xl bg-card py-16 text-center text-sm text-muted-foreground hairline-ring ring-border shadow-sm shadow-black/6.5">
					There is no member for filtered value
				</div>
			)}
		</>
	);
}
