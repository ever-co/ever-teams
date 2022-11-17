import { ITimerTasksSection } from "@components/home/timer-tasks";
import { PauseIcon } from "./pauseIcon";
import { PlayIcon } from "./playIcon";

const Timer = ({ started, setStarted }: ITimerTasksSection) => {
  return (
    <>
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
    </>
  );
};
export default Timer;
