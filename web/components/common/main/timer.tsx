import { useTimer } from "@app/hooks/useTimer";
import { useState } from "react";
import { PauseIcon } from "./pauseIcon";
import { PlayIcon } from "./playIcon";

const Separator = ({ size }: { size: number }) => {
  return <span className={`w-3 text-[${size}px] mx-2`}>:</span>;
};

const Timer = () => {
  const [started, setStarted] = useState(false);
  const { time, startTimer, running, stopTimer } = useTimer();

  return (
    <>
      <div className="flex flex-col">
        <h1 className="text-[53px] text-primary dark:text-[#FFFFFF] flex">
          <div className="w-[64px] flex items-end">
            {time.h < 10 ? "0" + time.h : time.h}
          </div>
          <Separator size={53} />
          <div className="w-[64px] flex items-end">
            {time.m < 10 ? "0" + time.m : time.m}
          </div>
          <Separator size={53} />
          <div className="w-[64px] flex items-end">
            {time.s < 10 ? "0" + time.s : time.s}
          </div>
          <Separator size={53} />
          <div className="text-[35px] w-[45px] flex items-end mb-2">
            {time.ms < 10 ? "0" + time.ms : time.ms}
          </div>
        </h1>
        <div className="flex w-[284px]">
          <div className="bg-[#28D581] w-[211px] h-[8px] rounded-l-full"></div>
          <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[73px] h-[8px] rounded-r-full" />
        </div>
      </div>
      <div
        className="cursor-pointer"
        onClick={() => {
          setStarted(!started);
          if (started) {
            stopTimer();
          } else {
            startTimer();
          }
        }}
      >
        {running ? (
          <PauseIcon width={68} height={68} />
        ) : (
          <PlayIcon width={68} height={68} />
        )}
      </div>
    </>
  );
};
export default Timer;
