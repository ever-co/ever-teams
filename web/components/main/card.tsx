import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { IMembers, IStartSection } from "../../app/interfaces/hooks";
import Image from "next/image";
import Separator from "../common/separator";
import { PauseIcon } from "../common/main/pauseIcon";
import { PlayIcon } from "../common/main/playIcon";

interface ICardProps extends IMembers, IStartSection {
  style: { width: string };
  length: number;
  i: number;
}

const Card = ({
  status,
  name,
  current,
  estimate,
  total,
  task,
  image,
  admin,
  started,
  setStarted,
}: ICardProps) => {
  const bgColor =
    status === "working"
      ? "bg-[#02b102]"
      : status === "offline"
      ? "bg-[#de211e]"
      : "bg-[#DF7C00]";
  return (
    <div
      className={`w-full rounded-[15px] ${
        admin
          ? "border border-primary dark:border-gray-100 "
          : " hover:border hover:border-primary"
      } bg-[#FFFFFF] my-[15px] dark:bg-[#202023] flex 
    justify-between text-primary dark:hover:border-gray-100  
    font-bold py-[24px] dark:text-[#FFFFFF]`}
    >
      <div className="w-[60px]  flex justify-center items-center">
        <div className={`rounded-[50%] w-5 h-5 ${bgColor}`}></div>
      </div>
      <div className="w-[215px] h-[48px] flex items-center justify-center">
        <div className="flex justify-center items-center">
          <Image src={image} alt="User Icon" width={48} height={48} />
        </div>
        <div className="w-[147px] mx-[20px] h-[48px] flex justify-center items-center">
          {name}
        </div>
      </div>
      <Separator />
      <div className="w-[334px]  font-light text-normal px-[14px] hover:border hover:border-[#D7E1EB] dark:hover:border-[#27272A] hover:rounded-[8px] hover:cursor-text">
        {" "}
        {task}
      </div>
      <Separator />
      <div className="w-[122px]  text-center flex justify-center items-center">
        {current}
        {admin && (
          <div
            className="ml-[10px] cursor-pointer"
            onClick={() => setStarted(!started)}
          >
            {started ? (
              <PauseIcon width={24} height={24} />
            ) : (
              <PlayIcon width={24} height={24} />
            )}
          </div>
        )}
      </div>
      <Separator />
      <div className="w-[245px]  flex justify-center items-center">
        <div>
          <div className="flex w-[245px]">
            <div className="bg-[#28D581] w-[211px] h-[8px] rounded-l-full"></div>
            <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[73px] h-[8px] rounded-r-full" />
          </div>
          <div className="text-center text-[14px] text-[#9490A0]  py-1 font-light">
            Estimate : {estimate}
          </div>
        </div>
      </div>
      <Separator />
      <div className="w-[184px]  flex items-center">
        <div className="w-[177px] text-center text-"> {total}</div>
        <div>
          <EllipsisVerticalIcon
            className="h-7 w-7 text-gray-300 dark:text-[#616164] cursor-pointer"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};
export default Card;
