import type { NextPage } from "next";
import { TeamMemberSection } from "../components/home/team-member";
import { TimerTasksSection } from "../components/home/timer-tasks";

const Home: NextPage = () => {
  return (
    <>
      <TimerTasksSection />
      <TeamMemberSection />
      <div className="mt-6" />
      <button className="px-9 py-2 inline-flex cursor-pointer rounded-md items-center border border-[#6E49E8]">
        <span className="text-sm text-[#6E49E8] font-semibold">Invite</span>
      </button>
    </>
  );
};

export default Home;
