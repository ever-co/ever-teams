import TeamLogo from "@components/common/team_logo";
import Header from "../components/home/header";
import TeamMemberSection from "../components/home/team-member";
import Footer from "@components/layout/footer/footer";
import Image from "next/image";
import { SetStateAction, useState } from "react";
import { Button } from "reactstrap";
import { TeamsDropDown } from "@components/common/dropDown";
import Profile from "@components/layout/header/profile";
import { TimerTasksSection } from "../components/home/timer-tasks";
import { Timer } from "@components/home/timer";
import { AppLayout } from "@components/layout";
const style = { width: 100 };
const tasks: string[] = ["Api integration", "Implement header"];

interface ITimerTasksSection {
  started: boolean;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
}

function Teamdetails() {
  const [started, setStarted] = useState(false);
  return (
    <AppLayout>
              <TimerTasksSection started={started} setStarted={setStarted} />
     {/* <div className="mx-9 my-9 flex">
        <div className="mt-10 w-[85rem] mx-[6rem]">
          <div className="">
            <button className="bg-gray-400 px-2 py-1 text-white font-bold rounded-md mb-6 flex">
              <div className="flex-1 mr-2">
                <Image
                  src="/assets/backbutton/left-arrow.png"
                  alt=""
                  width={10}
                  height={10}
                />
              </div>
              <div className="">Back to Team</div>
            </button>
          </div>
          <div className="">
            <div className="flex flex-row">
              <div className="">
                <Image
                  src="/assets/profiles/ruslan.png"
                  alt="User Icon"
                  width={80}
                  height={80}
                  className="rounded-full flex items-center justify-center"
                />
              </div>
              <div className="mt-4 mx-5">
                <h1 className="text-[#533F85] font-bold">Ruslan Konviser</h1>
                <h2 className="text-slate-400">Ruslan.k@everiq.com</h2>
              </div>
            </div>
            <div className="timer">
              <Timer started={started} setStarted={setStarted} />
            </div>
          </div>
          <div className="">
            <a href="#" className="underline mr-10 text-slate-500">
              Worked
            </a>
            <a href="#" className="mr-10 text-slate-500">
              Assigned
            </a>
            <a href="#" className="text-slate-500">
              Unassigned
            </a>
          </div>
        </div>
      </div>  */}
    </AppLayout>
  );
}

export default Teamdetails;
