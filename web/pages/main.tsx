import React, { useEffect, useState } from "react";
import TeamMemberSection from "../components/home/team-member";
import { TimerTasksSection } from "../components/home/timer-tasks";
import { AppLayout } from "../components/layout";

const Main = () => {
  const [started, setStarted] = useState(false);

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
