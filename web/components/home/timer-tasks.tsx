import TaskInput from "@components/common/main/task-input";
import StatusDropdown from "@components/common/main/status-dropdown";
import Timer from "@components/common/main/timer";
import { EstimateTime } from "./estimate-time";

const tasks: string[] = ["Api integration", "Implement header"];

export interface ITimerTasksSection {
  started: boolean;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TimerTasksSection({ started, setStarted }: ITimerTasksSection) {
  return (
    <div className="bg-[#FFFF] dark:bg-[#202023] mt-[120px] rounded-[20px] w-full h-[130px] flex items-center">
      <div className="ml-[16px] flex flex-col space-y-[15px] w-full">
        <div className="w-full">
          <TaskInput />
        </div>
        <div className="flex ml-[20px]">
          <EstimateTime />
          <StatusDropdown />
        </div>
      </div>
      <div className="flex justify-center items-center space-x-[27px] mr-[27px] w-1/2 ml-[48px]">
        <Timer started={started} setStarted={setStarted} />
      </div>
    </div>
  );
}
