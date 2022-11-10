import { Fragment, useCallback, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { PlusIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import OpenTaskIcon from "./dropdownIcons/open-task";
import CompletedTask from "./dropdownIcons/completed-task";
import UnassignedTask from "./dropdownIcons/unassigned-task";
import DeleteTask from "../delete-task";
import { useTeamTasks } from "@app/hooks/useTeamTasks";
import { ITeamTask, ITaskStatus } from "@app/interfaces/ITask";
import TodoTask from "./dropdownIcons/todo-task";
import TestingTask from "./dropdownIcons/testing-task";

export const StatusIcon = ({ taskStatus }: { taskStatus: ITaskStatus }) => {
  switch (taskStatus) {
    case "In Progress":
      return (
        <div className="px-2 py-1 bg-[#dcfce7] text-[#166534] rounded-2xl text-xs flex items-center justify-center">
          <OpenTaskIcon /> {taskStatus}
        </div>
      );
      break;
    case "Completed":
      return (
        <div className="px-2 py-1 bg-[#f3e8ff] text-[#6b21a8] rounded-2xl text-xs flex items-center justify-center">
          <CompletedTask /> {taskStatus}
        </div>
      );
      break;
    case "Todo":
      return (
        <div className="px-2 py-1 bg-[#e0e7ff] text-[#3730a3] rounded-2xl text-xs flex items-center justify-center">
          <TodoTask /> {taskStatus}
        </div>
      );
      break;
    case "For Testing":
      return (
        <div className="px-2 py-1 bg-[#e0e7ff] text-[#3730a3] rounded-2xl text-xs flex items-center justify-center">
          <TestingTask /> {taskStatus}
        </div>
      );
      break;
    default:
      return (
        <div className="px-2 py-1 bg-[#f3f4f6] text-[#1f2937] rounded-2xl text-xs flex items-center justify-center">
          <UnassignedTask />
          Unassigned
        </div>
      );
  }
};

function CreateTaskOption() {
  return (
    <div className="relative cursor-pointer select-none py-2 px-4 text-gray-700">
      <div className="flex items-center justify-start cursor-pointer text-primary dark:text-white">
        <span className="mr-[11px]">
          <PlusIcon className=" font-bold w-[16px] h-[16px]" />
        </span>
        Create new
      </div>
    </div>
  );
}

function TaskItem({
  selected,
  item,
  active,
  onDelete,
}: {
  selected: boolean;
  item: ITeamTask;
  active: boolean;
  onDelete: () => void;
}) {
  return (
    <>
      <span
        className={`truncate h-[30px] flex items-center ${
          selected ? "font-medium" : "font-normal"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          {item.title}
          <div className="flex items-center space-x-4">
            <StatusIcon taskStatus={item.status} />
            <div className="flex items-center justify-center space-x-1">
              {item.members &&
                item.members.map((member, i) => (
                  <div className="flex justify-center items-center" key={i}>
                    <Image
                      src={member.user.imageUrl}
                      alt={member.user.firstName || ""}
                      width={30}
                      height={30}
                    />
                  </div>
                ))}{" "}
            </div>

            <XMarkIcon
              className="w-5 h-5 text-gray-400 hover:text-primary"
              onClick={onDelete}
            />
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
  );
}

export default function Example() {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { tasks: ltasks, activeTeamTask } = useTeamTasks();

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const filteredTasks =
    query.trim() === ""
      ? ltasks
      : ltasks.filter((task) =>
          task.title
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        );

  return (
    <div className="w-full">
      <Combobox value={selected} onChange={setSelected}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg  bg-[#EEEFF5] dark:bg-[#1B1B1E] text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm ">
            <Combobox.Input
              className="h-[60px] bg-[#EEEFF5] dark:bg-[#1B1B1E] placeholder-[#9490A0] dark:placeholder-[#616164] w-full rounded-[10px] px-[20px] py-[18px] shadow-inner"
              displayValue={(task: ITeamTask) => task && task.title}
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
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#FFFFFF] dark:bg-[#1B1B1E] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredTasks.length === 0 && query !== "" ? (
                <CreateTaskOption />
              ) : (
                filteredTasks.map((task) => (
                  <Combobox.Option
                    key={task.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active
                          ? "bg-[#F9FAFB] text-primary dark:text-white dark:bg-[#202023] cursor-pointer"
                          : "text-gray-900 dark:text-white"
                      }`
                    }
                    value={task}
                  >
                    {({ selected, active }) => {
                      return (
                        <TaskItem
                          selected={selected}
                          active={active}
                          item={task}
                          onDelete={openModal}
                        />
                      );
                    }}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
      <DeleteTask isOpen={isOpen} closeModal={closeModal} Fragment={Fragment} />
    </div>
  );
}
