import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { PlusIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import OpenTaskIcon from "./dropdownIcons/open-task";
import CompletedTask from "./dropdownIcons/completed-task";
import UnassignedTask from "./dropdownIcons/unassigned-task";

interface IUser {
  name: string;
  image: string;
}
interface IStatusIcon {
  taskStatus: TaskStatus;
}

enum TaskStatus {
  COMPLETED = "Complete",
  IN_PROGRESS = "Progress",
  ASSIGNED = "Assigned",
  UNASSIGNED = "Unassigned",
}

interface ITask {
  id: number;
  name: string;
  assignees: IUser[];
  status: TaskStatus;
}
const tasks: ITask[] = [
  {
    id: 1,
    name: "API Integration",
    assignees: [
      { name: "miracle", image: "/assets/profiles/kevin.png" },
      { name: "isaac", image: "/assets/profiles/roska.png" },
    ],
    status: TaskStatus.COMPLETED,
  },
  {
    id: 2,
    name: "Design Profile Screen",
    assignees: [
      {
        name: "julien",
        image: "/assets/profiles/ruslan.png",
      },
      {
        name: "miracle",
        image: "/assets/profiles/Profile.png",
      },
    ],
    status: TaskStatus.IN_PROGRESS,
  },
  {
    id: 3,
    name: "Improve Main Page Design",
    assignees: [],
    status: TaskStatus.UNASSIGNED,
  },
  {
    id: 4,
    name: "Deploy App",
    assignees: [
      {
        name: "julien",
        image: "/assets/profiles/ruslan.png",
      },
    ],
    status: TaskStatus.ASSIGNED,
  },
];

const StatusIcon = ({ taskStatus }: IStatusIcon) => {
  switch (taskStatus) {
    case TaskStatus.IN_PROGRESS:
      return (
        <div className="px-2 py-1 bg-[#dcfce7] text-[#166534] rounded-2xl text-xs flex items-center justify-center">
          <OpenTaskIcon /> {taskStatus}
        </div>
      );
      break;
    case TaskStatus.COMPLETED:
      return (
        <div className="px-2 py-1 bg-[#f3e8ff] text-[#6b21a8] rounded-2xl text-xs flex items-center justify-center">
          <CompletedTask />
          {taskStatus}
        </div>
      );
      break;
    case TaskStatus.ASSIGNED:
      return (
        <div className="px-2 py-1 bg-[#e0e7ff] text-[#3730a3] rounded-2xl text-xs flex items-center justify-center">
          <UnassignedTask color="#3730a3" />
          {taskStatus}
        </div>
      );
      break;
    default:
      return (
        <div className="px-2 py-1 bg-[#f3f4f6] text-[#1f2937] rounded-2xl text-xs flex items-center justify-center">
          <UnassignedTask />
          {taskStatus}
        </div>
      );
  }
};

export default function Example() {
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
    <div className="w-full">
      <Combobox value={selected} onChange={setSelected}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg  bg-[#EEEFF5] dark:bg-[#1B1B1E] text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
            <Combobox.Input
              className="h-[60px] bg-[#EEEFF5] dark:bg-[#1B1B1E] placeholder-[#9490A0] dark:placeholder-[#616164] w-full rounded-[10px] px-[20px] py-[18px] shadow-inner"
              displayValue={(task: ITask) => task && task.name}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What you working on?"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
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
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#FFFFFF] dark:bg-[#1B1B1E] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredTasks.length === 0 && query !== "" ? (
                <div className="relative cursor-pointer select-none py-2 px-4 text-gray-700">
                  <div className="flex items-center justify-start cursor-pointer text-primary dark:text-white">
                    <span className="mr-[11px]">
                      <PlusIcon className=" font-bold w-[16px] h-[16px]" />
                    </span>
                    Create new
                  </div>
                </div>
              ) : (
                filteredTasks.map((filteredTask) => (
                  <Combobox.Option
                    key={filteredTask.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active
                          ? "bg-[#F9FAFB] text-primary dark:text-white dark:bg-[#202023] cursor-pointer"
                          : "text-gray-900 dark:text-white"
                      }`
                    }
                    value={filteredTask}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`truncate h-[30px] flex items-center ${
                            selected ? "font-medium" : "font-normal"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            {filteredTask.name}
                            <div className="flex items-center space-x-4">
                              <StatusIcon taskStatus={filteredTask.status} />
                              <div className="flex items-center justify-center space-x-1">
                                {filteredTask.assignees &&
                                  filteredTask.assignees.map((assignee) => (
                                    <div
                                      className="flex justify-center items-center"
                                      key={assignee.name}
                                    >
                                      <Image
                                        src={assignee.image}
                                        alt={assignee.name}
                                        width={30}
                                        height={30}
                                      />
                                    </div>
                                  ))}{" "}
                              </div>

                              <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-primary" />
                            </div>
                          </div>
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? "text-white" : "text-primary"
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
