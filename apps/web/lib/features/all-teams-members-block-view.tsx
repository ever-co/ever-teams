import { IOrganizationTeamList, OT_Member } from '@app/interfaces';
import UserTeamBlockCard from './all-teams/users-teams-block/member-block';

interface Employee extends OT_Member {
	teams: { team: IOrganizationTeamList; activeTaskId?: string | null }[];
}

export default function AllTeamsMembersBlockView({ teams }: { teams: IOrganizationTeamList[] }) {
	const employees: Employee[] = teams.flatMap((team) =>
		team.members.map((member) => ({
			...member,
			teams: [{ team, activeTaskId: member.activeTaskId }]
		}))
	);

	const groupedEmployees: Record<string, Employee> = employees.reduce(
		(acc, employee) => {
			if (!acc[employee.employeeId]) {
				acc[employee.employeeId] = { ...employee, teams: [] };
			}
			acc[employee.employeeId].teams.push(...employee.teams);
			return acc;
		},
		{} as Record<string, Employee>
	);

	const employeesArray: Employee[] = Object.values(groupedEmployees);

	return (
		<>
			{employeesArray.map((employee) => (
				<UserTeamBlockCard key={employee.id} member={employee} />
			))}
		</>
	);
}
