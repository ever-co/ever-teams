import React, { useState, Fragment } from "react";
import { TeamMemberSection } from "../components/home/team-member";
import { TimerTasksSection } from "../components/home/timer-tasks";
import Invite from "../components/invite/invite";
import { AppLayout } from "../components/layout";

const Main = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  return (
    <>
      <AppLayout>
        <div className="">
          <TimerTasksSection />
          <TeamMemberSection />
          <div className="mt-6" />
          <button
            onClick={openModal}
            className="px-9 hover:bg-[#6E49E8] hover:text-white py-2 inline-flex cursor-pointer rounded-md items-center border border-[#6E49E8]"
          >
            <span className="text-sm text-[#6E49E8 font-semibold">Invite</span>
          </button>
        </div>
      </AppLayout>
      <Invite isOpen={isOpen} closeModal={closeModal} Fragment={Fragment} />
    </>
  );
};
export default Main;
