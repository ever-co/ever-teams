import { useState } from "react";
import { PauseIcon } from "../common/main/pauseIcon";
import { PlayIcon } from "../common/main/playIcon";

const tasks: string[] = ["Api integration", "Implement header"];

interface ITimerTasksSection {
  started: boolean;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TimerTasksSection({ started, setStarted }: ITimerTasksSection) {
  return (
    <div className="bg-[#FFFFFF] dark:bg-[#202023] mt-[140px] rounded-[20px] w-full h-[130px] flex justify-between items-center">
      <div className="ml-[16px] flex flex-col space-y-[15px]">
        <div className="">
          <input
            className="h-[60px] bg-[#EEEFF5] dark:bg-[#1B1B1E] placeholder-[#9490A0] dark:placeholder-[#616164] w-[470px] rounded-[10px] px-[20px] py-[18px] shadow-inner"
            placeholder="What you working on?"
          />
        </div>
        <div className="flex ml-[20px] ">
          <span className="text-[18px] text-[#9490A0] dark:text-[#616164] font-base">
            Estimate :{" "}
          </span>
          <input
            className="placeholder:font-light w-[50px] mx-5 text-[14px] text-center border-b-2 dark:border-[#616164] border-dashed  placeholder:text-center bg-transparent"
            placeholder="Hours"
          />{" "}
          /{" "}
          <input
            className="placeholder:font-light w-[50px] mx-5 text-[14px] text-center border-b-2  dark:border-[#616164] border-dashed placeholder:text-center bg-transparent"
            placeholder="Minutes"
          />
        </div>
      </div>
      <div className="flex justify-center items-center space-x-[27px] mr-[27px]">
        <div className="flex flex-col">
          <h1 className="text-[53px] text-primary dark:text-[#FFFFFF]">
            01 : 10 : 36 : <span className="text-[35px]">20</span>
          </h1>
          <div className="flex w-[284px]">
            <div className="bg-[#28D581] w-[211px] h-[8px] rounded-l-full"></div>
            <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[73px] h-[8px] rounded-r-full" />
          </div>
        </div>
        <div className="cursor-pointer" onClick={() => setStarted(!started)}>
          {started ? (
            <PauseIcon width={68} height={68} />
          ) : (
            <PlayIcon width={68} height={68} />
          )}
        </div>
      </div>
    </div>
  );
}
