import useAuthenticateUser from "@app/hooks/useAuthenticateUser";
import { useOrganizationTeams } from "@app/hooks/useOrganizationTeams";
import React, { useEffect, useState } from "react";
import TeamMemberSection from "../components/home/team-member";
import { TimerTasksSection } from "../components/home/timer-tasks";
import { AppLayout } from "../components/layout";

const Main = () => {
  const [started, setStarted] = useState(false);
  const { loadTeamsData } = useOrganizationTeams();
  const { timeToTimeRefreshToken } = useAuthenticateUser();

  useEffect(() => {
    loadTeamsData().then((res) => {
      console.log(res.data);
    });
    timeToTimeRefreshToken();
  }, []);

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#18181B]">
      <AppLayout>
        <div className="">
          <TimerTasksSection started={started} setStarted={setStarted} />
          <TeamMemberSection started={started} setStarted={setStarted} />
        </div>
      </AppLayout>
    </div>
  );
};
export default Main;
