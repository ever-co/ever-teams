import React from "react";

const TimerDisplay = ({
  timer,
  progress,
  timerTextColor,
  progressColor,
  progressBgColor,
}: any) => {
  return (
    <div>
      <div className="flex items-center">
        <div className="text-2xl mr-2">▶️</div>
        <div className={`text-2xl mr-4 ${timerTextColor}`}>{timer}</div>
        <div className="text-sm text-gray-500">On this site: {progress}</div>
      </div>
      <div className={`w-full h-1 mt-1 ${progressBgColor}`}>
        <div
          className={`h-full ${progressColor}`}
          style={{ width: progress }}
        ></div>
      </div>
    </div>
  );
};

export default TimerDisplay;
