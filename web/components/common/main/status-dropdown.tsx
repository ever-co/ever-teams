import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import Image from "next/image";

interface ITasks {
  name: string;
  icon: string;
  color: string;
}

const tasks: ITasks[] = [
  {
    name: "No status",
    color: "#8F97A1",
    icon: "/assets/svg/no-status.svg",
  },
  {
    name: "In progress",
    color: "735EA8",
    icon: "/assets/svg/in-progress.svg",
  },
  {
    name: "In review",
    color: "#8B7FAA",
    icon: "/assets/svg/in-review.svg",
  },
  {
    name: "Completed",
    color: "3D9A6D",
    icon: "/assets/svg/complete-task.svg",
  },
];

const StatusDropdown = () => {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const filteredTasks =
    query === ""
      ? tasks
      : tasks.filter((task) =>
          task.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        );

  return (
    <div className="w-[141px] h-[30px]">
      <Combobox value={selected} onChange={setSelected}>
        <div className="relative w-full cursor-default overflow-hidden rounded-lg  bg-[#EEEFF5] dark:bg-[#1B1B1E] text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
          <Combobox.Input
            className="h-[30px] bg-[#F0ECFD] dark:bg-[#1B1B1E] placeholder-[#9490A0] dark:placeholder-[#616164] w-full rounded-[10px] px-[20px] py-1"
            displayValue={(task: ITasks) => task && task.name}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Status"
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDownIcon
              className={`
                  ml-2 h-5 w-5 text-primary dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80`}
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery("")}
        >
          <Combobox.Options className="absolute mt-1 max-h-60 w-[141px] overflow-auto rounded-md bg-[#FFFFFF] dark:bg-[#1B1B1E] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredTasks.length === 0 && query !== "" ? (
              <div className="relative cursor-pointer select-none py-2 px-4 text-gray-700">
                <div className="flex items-center justify-start cursor-pointer text-primary dark:text-white">
                  Not found
                </div>
              </div>
            ) : (
              filteredTasks.map((filteredTask) => (
                <Combobox.Option
                  key={filteredTask.name}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-5 pr-4 ${
                      active
                        ? "bg-[#F9FAFB] text-primary dark:text-white dark:bg-[#202023] cursor-pointer"
                        : ` text-[#${filteredTask.color}] dark:text-white`
                    }`
                  }
                  value={filteredTask}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`truncate h-[20px] flex items-center ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-start w-full text-xs text-[#8F97A1]`}
                        >
                          <div className="mr-[9px]">
                            <Image
                              src={filteredTask.icon}
                              width={10}
                              height={10}
                              alt={filteredTask.name}
                            />
                          </div>

                          {filteredTask.name}
                        </div>
                      </span>
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </Combobox>
    </div>
  );
};

export default StatusDropdown;
