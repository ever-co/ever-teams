import { TimeInput } from "@components/common/main/time-input";
import TaskInput from "@components/common/main/task-input";
import StatusDropdown from "@components/common/main/status-dropdown";
import Timer from "@components/common/main/timer";

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
          <span className="text-[18px] text-[#9490A0] dark:text-[#616164] font-base">
            Estimate :{" "}
          </span>
          <TimeInput
            type="text"
            value=""
            handleChange={() => {}}
            placeholder="Hours"
            style="mx-5 w-[50px] bg-transparent"
          />{" "}
          /{" "}
          <TimeInput
            type="text"
            value=""
            handleChange={() => {}}
            placeholder="Minutes"
            style="mx-5 w-[50px] bg-transparent"
          />
          <StatusDropdown />
        </div>
      </div>
      <div className="flex justify-center items-center space-x-[27px] mr-[27px] w-1/2 ml-[48px]">
        <Timer started={started} setStarted={setStarted} />
      </div>
    </div>
  );
}
