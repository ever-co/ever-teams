import Separator from "../common/separator";
import DropdownUser from "@components/common/main/dropdown-user";
import StatusDropdown from "@components/common/main/status-dropdown";
import { ITeamTask } from "@app/interfaces/ITask";
import { secondsToTime } from "@app/helpers/date";

interface IProfileCard {
  now?: boolean;
  task: ITeamTask | null;
  current: string;
}
const ProfileCard = ({ now = false, task, current }: IProfileCard) => {
  const { m, h } = secondsToTime((task && task.estimate) || 0);
  return (
    <div
      className={`w-full rounded-[10px] drop-shadow-[0px_3px_15px_#3E1DAD1A] border ${
        now === true
          ? "  border-primary dark:border-gray-100"
          : " hover:border hover:border-primary dark:border-[#202023]"
      } bg-[#FFFFFF] my-[15px] dark:bg-[#202023] 
  justify-between  dark:hover:border-gray-100  
  font-bold px-[24px] dark:text-[#FFFFFF] py-[10px]`}
    >
      <div className="flex items-center justify-between ">
        <div
          className={`text-primary dark:text-[#FFFFFF] text-[14px] ${
            now == true ? "font-normal" : "font-light"
          } w-[413px]`}
        >
          {`#${task && task.taskNumber} `} {task && task.title}
        </div>
        <Separator />
        <div className="w-[122px]  text-center text-primary dark:text-[#FFFFFF] flex justify-center items-center">
          {current}
        </div>
        <Separator />

        <div className="w-[245px]  flex justify-center items-center">
          <div>
            <div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex items-center justify-center">
              <div> Estimate</div>
            </div>
            <div className="flex w-[200px]">
              <div className="bg-[#28D581] w-[211px] h-[8px] rounded-l-full"></div>
              <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[73px] h-[8px] rounded-r-full" />
            </div>
            <div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex items-center justify-center">
              <div>
                {" "}
                {h}h{m}m
              </div>
            </div>
          </div>
        </div>
        <Separator />

        <div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex flex-col items-center justify-center">
          <StatusDropdown />
        </div>

        <Separator />
        <div className="w-[14px]  flex items-center">
          <DropdownUser setEdit={() => {
            // 
          }} setEstimateEdit={() => {
            //
          }} />
        </div>
      </div>
    </div>
  );
};
export default ProfileCard;
