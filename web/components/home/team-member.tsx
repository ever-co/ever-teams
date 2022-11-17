import Header from "./header";
import Card from "../main/card";
import InviteCard from "../main/invite-card";
import useAuthenticateUser from "@app/hooks/useAuthenticateUser";
import { useOrganizationTeams } from "@app/hooks/useOrganizationTeams";

const TeamMemberSection = () => {
  const { isTeamManager, user } = useAuthenticateUser();
  const { activeTeam } = useOrganizationTeams();
  const members = activeTeam?.members || [];
  const style = { width: `${100 / members.length}%` };

  const currentUser = members.find((m) => {
    return m.employee.userId === user?.id;
  });

  const $members = members.filter((m) => {
    return m.employee.userId !== user?.id;
  });

  return (
    <div className="mt-[42px]">
      <ul className="w-full">
        <Header style={style} />
        {currentUser && (
          <li key={currentUser.id}>
            <Card member={currentUser} />
          </li>
        )}
        {$members.map((member) => (
          <li key={member.id}>
            <Card member={member} />
          </li>
        ))}

        {isTeamManager && (
          <li>
            <InviteCard />
          </li>
        )}
      </ul>
    </div>
  );
};
export default TeamMemberSection;
