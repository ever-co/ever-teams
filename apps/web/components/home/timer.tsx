import { PlayIcon } from "../common/main/playIcon";

export function TimerController() {
  return (
    <>
      <div className="flex flex-col">
        <h1 className="text-[53px] text-primary dark:text-[#FFFFFF]">
          00 : 00 : 00
        </h1>
        <div className="flex w-[284px]">
          <div className="bg-[#28D581] w-[211px] h-[8px] rounded-l-full"></div>
          <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[73px] h-[8px] rounded-r-full" />
        </div>
      </div>
      <div className="cursor-pointer">
        <PlayIcon width={68} height={68} />
      </div>
    </>
  );
}
