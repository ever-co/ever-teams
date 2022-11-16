import useAuthenticateUser from "@app/hooks/useAuthenticateUser";
import { useOrganizationTeams } from "@app/hooks/useOrganizationTeams";
import { useTeamTasks } from "@app/hooks/useTeamTasks";
import { useEffect, useState } from "react";
import TeamMemberSection from "../components/home/team-member";
import { TimerTasksSection } from "../components/home/timer-tasks";
import { AppLayout } from "../components/layout";

const Main = () => {
  const [started, setStarted] = useState(false);
  const { loadTeamsData } = useOrganizationTeams();
  const { timeToTimeRefreshToken } = useAuthenticateUser();
  const { firstLoadTasksData } = useTeamTasks();

  useEffect(() => {
    loadTeamsData();
    firstLoadTasksData();
    const clear = timeToTimeRefreshToken();
    return () => {
      clear();
    };
  }, []);

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#18181B]">
      <AppLayout>
        <div className="">
          <TimerTasksSection />
          <TeamMemberSection started={started} setStarted={setStarted} />
        </div>
      </AppLayout>
    </div>
  );
};
export default Main;
