import { useTimer } from "@app/hooks/useTimer";
import { PauseIcon } from "./pauseIcon";
import { PlayIcon } from "./playIcon";

function pad(num: number, totalLength = 2) {
  return String(num).padStart(totalLength, "0");
}

const Timer = () => {
  const {
    fomatedTimeCounter: { m, h, s },
    timerStatus,
    timerStatusFetching,
    startTimer,
    stopTimer,
    canRunTimer,
  } = useTimer();

  const timerHanlder = () => {
    if (timerStatusFetching || !canRunTimer) return;
    if (timerStatus?.running) {
      stopTimer();
    } else {
      startTimer();
    }
  };

  return (
    <>
      <div className="flex flex-col">
        <h1 className="text-[53px] text-primary dark:text-[#FFFFFF]">
          {pad(h)} : {pad(m)} : {pad(s)}
          {/* : <span className="text-[35px]">20</span> */}
        </h1>
        <div className="flex w-[284px]">
          <div className="bg-[#28D581] w-[10%] h-[8px] rounded-l-full"></div>
          <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-full h-[8px] rounded-r-full" />
        </div>
      </div>
      <div
        className={`cursor-pointer ${
          timerStatusFetching || !canRunTimer ? "opacity-30" : ""
        }`}
        onClick={!timerStatusFetching ? timerHanlder : undefined}
      >
        {timerStatus?.running ? (
          <PauseIcon width={68} height={68} />
        ) : (
          <PlayIcon width={68} height={68} />
        )}
      </div>
    </>
  );
};
export default Timer;
