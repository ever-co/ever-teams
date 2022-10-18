import { useState } from "react";
import DropDown from "../common/dropDown";

const tasks: string[] = ["Api integration", "Implement header"];

export function TimerTasksSection() {
  const [selectedTask, setSelectedTask] = useState(tasks[0]);
  return (
    <div className="grid grid-cols-4 pt-36 mb-4 justify-between">
      <div className="col-span-2">
        <div className="max-w-[22rem] rounded drop-shadow-sm bg-white card__bg-color">
          <div className="px-4 py-4 inline-flex items-center space-x-6 w-full">
            <div className="font-bold text-md flex-1 dark:text-white ">
              Active task:{" "}
            </div>
            <span className="flex-[2]">
              <DropDown
                data={tasks}
                selectedData={selectedTask}
                handleSelectData={setSelectedTask}
              />
            </span>
          </div>
        </div>
        <div className="mt-5">
          <span className="dark:text-opacity-80  bg-gray-300 dark:bg-gray-900 rounded-md text-sm font-medium text-slate-600  dark:text-white p-2">
            Estimated: 40h:15min
          </span>
        </div>
      </div>
      <div className="col-span-2 justify-end flex">
        <div className="p-4 w-96 rounded py-4 bg-white card__bg-color">
          <div className="flex flex-row justify-between py-1">
            <div>
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                02 : 10 : 59
              </h2>
            </div>

            <div>
              <button className="px-4 py-2 inline-flex cursor-pointer rounded-md items-center bg-[#6E49E8]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-4 h-6 mr-2"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-white text-sm font-bold">Start</span>
              </button>
            </div>
          </div>
          <div className="flex flex-row py-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-purple-600 h-2.5 rounded-full dark:bg-purple-500"
                style={{ width: "45%" }}
              ></div>
            </div>
          </div>
          <div className="flex flex-row justify-between px-0.5">
            <div>2:15:30</div>
            <div>4:05:00</div>
          </div>
        </div>
      </div>
    </div>
  );
}
