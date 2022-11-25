import { Popover, Transition } from "@headlessui/react";
import { EllipsisVerticalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import React, {
  Dispatch,
  Fragment,
  SetStateAction,
  useMemo,
  useState,
} from "react";
import { usePopper } from "react-popper";
import Image from "next/image";
import DeleteTask from "../delete-task";
import { ITaskStatus, ITeamTask } from "@app/interfaces/ITask";
import { useTeamTasks } from "@app/hooks/useTeamTasks";
import { TaskItem } from "./task-item";
import TaskFilter from "./task-filter";
import { h_filter } from "./task-input";

interface IOption {
  name: string;
  handleClick: any;
  extramenu?: boolean;
}

interface IDropdownUserProps {
  setEdit: Dispatch<SetStateAction<boolean>>;
  setEstimateEdit: Dispatch<SetStateAction<boolean>>;
}

const DropdownUser = ({ setEdit, setEstimateEdit }: IDropdownUserProps) => {
  const { tasks, updateTask } = useTeamTasks();
  let [referenceElement, setReferenceElement] = useState<
    Element | null | undefined
  >();
  let [popperElement, setPopperElement] = useState<
    HTMLElement | null | undefined
  >();
  const [isOpen, setIsOpen] = useState(false);
  let { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "left",
  });

  const { updateLoading } = useTeamTasks();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"closed" | "open">("open");
  const [openFilter, setOpenFilter] = useState(true);
  const [closeTask, setCloseTask] = useState<ITeamTask | null>(null);

  const openModal = () => {
    setIsOpen(true);
  };

  const options: IOption[] = [
    {
      name: "Edit",
      handleClick: setEdit,
    },
    {
      name: "Estimate",
      handleClick: setEstimateEdit,
    },
    {
      name: "Assign new task",
      handleClick: () => {},
      extramenu: true,
    },
    {
      name: "Unassign task",
      handleClick: () => {},
      extramenu: true,
    },
    {
      name: "Make a manager ",
      handleClick: () => {},
    },
    {
      name: "Remove",
      handleClick: () => {},
    }
  ];

  const filteredTasks = useMemo(() => {
    return query.trim() === ""
      ? tasks.filter((task) => h_filter(task.status, filter))
      : tasks.filter(
          (task) =>
            task.title
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "")
              .startsWith(query.toLowerCase().replace(/\s+/g, "")) &&
            h_filter(task.status, filter)
        );
  }, [query, tasks, filter]);

  const filteredTasks2 = useMemo(() => {
    return query.trim() === ""
      ? tasks
      : tasks.filter((task) =>
          task.title
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .startsWith(query.toLowerCase().replace(/\s+/g, ""))
        );
  }, [query, tasks]);

  const handleOpenModal = (concernedTask: ITeamTask) => {
    setCloseTask(concernedTask);
    openModal();
  };

  const handleReopenModal = (concernedTask: ITeamTask) => {
    if (concernedTask) {
      updateTask({
        ...concernedTask,
        status: "Todo",
      });
    }
  };

  return (
    <>
      <Popover className="relative border-none no-underline">
        {({ open }) => (
          <>
            <Popover.Button className="border-none outline-none active:border-none no-underline">
              <EllipsisVerticalIcon
                className="h-7 w-7 text-gray-300 dark:text-[#616164] cursor-pointer no-underline"
                aria-hidden="true"
              />
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[150px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl drop-shadow-[0px_3px_15px_#3E1DAD1A]">
                <div className="bg-white shadow dark:bg-[#18181B] rounded-[10px] text-[14px] font-light">
                  {options.map((option) =>
                    !option.extramenu ? (
                      <React.Fragment key={option.name}>
                        <button
                          onClick={option.handleClick}
                          className="hover:bg-gray-100 dark:hover:bg-[#202023] dark:hover:text-white py-2 px-4 mt-1 flex items-center text-gray-600 dark:text-gray-200 justify-start w-full"
                        >
                          {option.name}
                        </button>
                      </React.Fragment>
                    ) : (
                      <Popover
                        key={option.name}
                        className="relative border-none no-underline"
                      >
                        {({ open }) => (
                          <>
                            <Popover.Button
                              onClick={option.handleClick}
                              ref={setReferenceElement}
                              className="outline-none  hover:bg-gray-100 dark:hover:bg-[#202023] dark:hover:text-white py-2 px-4 mt-1 flex items-center text-gray-600 dark:text-gray-200 justify-start w-full"
                            >
                              {option.name}{" "}
                            </Popover.Button>
                            <Transition
                              as={Fragment}
                              enter="transition ease-out duration-200"
                              enterFrom="opacity-0 translate-y-1"
                              enterTo="opacity-100 translate-y-0"
                              leave="transition ease-in duration-150"
                              leaveFrom="opacity-100 translate-y-0"
                              leaveTo="opacity-0 translate-y-1"
                            >
                              <Popover.Panel
                                ref={setPopperElement}
                                style={styles.popper}
                                {...attributes.popper}
                                className="w-[578px] bg-[#FFFFFF] dark:bg-[#1B1B1E] rounded-[10px] drop-shadow-[0px_3px_15px_#3E1DAD1A] dark:drop-shadow-[0px_3px_15px_#0000000D] py-[20px]"
                              >
                                <div className="mx-9">
                                  <input
                                    className="w-[508px] text-normal h-[50px] bg-[#EEEFF5] dark:bg-[#1B1B1E] placeholder-[#9490A0] dark:placeholder-[#616164] rounded-[10px] px-[20px] py-[18px] shadow-inner outline-none"
                                    placeholder="What you working on?"
                                    onChange={(event) =>
                                      setQuery(event.target.value)
                                    }
                                  />
                                </div>
                                <div className="ml-9 flex items-center justify-start space-x-2 mb-4 mt-[26px]">
                                  <TaskFilter
                                    count={
                                      filteredTasks2.filter((f_task) => {
                                        return f_task.status !== "Closed";
                                      }).length
                                    }
                                    type="open"
                                    selected={openFilter}
                                    handleChange={() => {
                                      setOpenFilter(true);
                                      setFilter("open");
                                    }}
                                  />
                                  <TaskFilter
                                    count={
                                      filteredTasks2.filter((f_task) => {
                                        return f_task.status === "Closed";
                                      }).length
                                    }
                                    type="closed"
                                    selected={!openFilter}
                                    handleChange={() => {
                                      if (
                                        filteredTasks2.filter((f_task) => {
                                          return f_task.status === "Closed";
                                        }).length > 0
                                      ) {
                                        setOpenFilter(false);
                                        setFilter("closed");
                                      }
                                    }}
                                  />
                                </div>
                                {filteredTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="px-9 cursor-pointer"
                                  >
                                    <div className="py-2">
                                      <TaskItem
                                        selected={false}
                                        active={false}
                                        item={task}
                                        onDelete={() => handleOpenModal(task)}
                                        onReopen={() => handleReopenModal(task)}
                                        updateLoading={updateLoading}
                                      />
                                    </div>
                                    <div className="w-full h-[1px] bg-[#EDEEF2] dark:bg-gray-700" />
                                  </div>
                                ))}
                              </Popover.Panel>
                            </Transition>
                          </>
                        )}
                      </Popover>
                    )
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
      <DeleteTask
        isOpen={isOpen}
        closeModal={() => {
          setIsOpen(false);
        }}
        task={closeTask}
        Fragment={Fragment}
      />
    </>
  );
};

export default DropdownUser;
