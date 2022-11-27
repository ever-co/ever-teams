import { IInviteProps } from "@app/interfaces/hooks";
import { useTeamTasks } from "@app/hooks/useTeamTasks";
import React, { useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Spinner } from "./spinner";

const DeleteTask = ({ isOpen, Fragment, closeModal, task }: IInviteProps) => {
  const { updateTask, updateLoading, setActiveTask, tasks } = useTeamTasks();

  const handleChange = useCallback(async () => {
    if (task) {
      await updateTask({
        ...task,
        status: "Closed",
      });
    }
    setActiveTask(tasks.filter((tas) => tas?.status !== "Closed")[0]);
    closeModal();
  }, [closeModal, setActiveTask, task, tasks, updateTask]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <div className="fixed inset-0 blur-xl bg-black/30" aria-hidden="true" />
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black blur-xl bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-[414px] px-[40px] py-[16px] max-w-md transform overflow-hidden rounded-[40px] bg-[#FFFFFF] dark:bg-[#202023] text-left align-middle shadow-xl shadow-[#3E1DAD0D] transition-all">
                <div className="text-primary text-[18px] dark:text-white text-center mb-4 mt-[30px]">
                  Please confirm if you want to close the task :{" "}
                  <span>{task && task.title}</span>
                </div>
                <div className="flex items-center justify-between w-full mt-2">
                  <button
                    className={`w-[120px] h-[40px] ${
                      updateLoading ? "opacity-50" : ""
                    } my-4 inline-flex justify-center items-center tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-[12px] hover:text-opacity-90 focus:outline-none`}
                    type="submit"
                    onClick={handleChange}
                  >
                    {updateLoading && (
                      <span>
                        <Spinner />
                      </span>
                    )}{" "}
                    Confirm
                  </button>
                  <button
                    className={`w-[120px] h-[40px] my-4 inline-flex justify-center items-center tracking-wide text-white transition-colors duration-200 transform bg-gray-600 dark:bg-gray-700 rounded-[12px] hover:text-opacity-90 focus:outline-none`}
                    type="submit"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DeleteTask;
