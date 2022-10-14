import React from "react";
import { TeamMemberSection } from "../components/home/team-member";
import { TimerTasksSection } from "../components/home/timer-tasks";
import { AppLayout } from "../components/layout";

const Main = () => {
  return (
    <AppLayout>
      <TimerTasksSection />
      <TeamMemberSection />
      <div className="mt-6" />
      <button className="px-9 hover:bg-[#6e49e816] py-2 inline-flex cursor-pointer rounded-md items-center border border-[#6E49E8]">
        <span className="text-sm text-[#6E49E8] font-semibold">Invite</span>
      </button>
    </AppLayout>
  );
};
export default Main;
