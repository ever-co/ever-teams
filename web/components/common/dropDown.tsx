import { useOrganizationTeams } from "@app/hooks/useOrganizationTeams";
import { IOrganizationTeamList } from "@app/interfaces/IOrganizationTeam";
import { activeTeamState } from "@app/stores";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Fragment, useState } from "react";

const imgTitle = (name: string) => {
  return name.split(" ")[1]
    ? name.split(" ")[0].charAt(0).toUpperCase() +
        name.split(" ")[1].charAt(0).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const colors = [
  "#F5F6FB",
  "#F5F6FB",
  "#E8EBF8",
  "#D7E1EB",
  "#E3EDF9",
  "#F5F6FB",
];

export const TeamsDropDown = () => {
  const [edit, setEdit] = useState<boolean>(false);
  const { teams, activeTeam, setActiveTeam } = useOrganizationTeams();

  return (
    <div className="w-[290px] max-w-sm">
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              className={`w-[290px] h-[50px]
                ${open ? "" : "text-opacity-90"}
                group inline-flex items-center rounded-[12px] bg-[#E8EBF8] dark:bg-[#18181B] px-3 py-2 text-base font-medium text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
            >
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-[32px] h-[32px] rounded-full bg-white text-primary flex justify-center items-center text-[10px]">
                    {activeTeam ? imgTitle(activeTeam.name) : ""}
                  </div>
                  <span className="text-[18px] text-primary text-normal dark:text-white">
                    {activeTeam?.name}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`${open ? "" : "text-opacity-70"}
                  ml-2 h-5 w-5 text-primary dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80`}
                  aria-hidden="true"
                />
              </div>
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
              <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[290px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl">
                <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="relative grid gap-[8px] bg-[#FFFFFF] dark:bg-[#18181B] px-3 py-4 lg:grid-cols-1 w-full">
                    {teams.map((item) => {
                      const color =
                        colors[Math.floor(Math.random() * colors.length)];
                      return (
                        <div
                          key={item.id}
                          className="cursor-pointer font-light"
                          onClick={() => setActiveTeam(item.id)}
                        >
                          <div className="flex items-center justify-start space-x-4">
                            <div
                              className={`w-[32px] h-[32px] rounded-full font-bold bg-[${color}]  text-primary flex justify-center items-center text-[10px]`}
                            >
                              {imgTitle(item.name)}
                            </div>
                            <span className="text-[16px] text-primary text-normal dark:text-white">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {edit === true ? (
                    <div className="bg-white dark:bg-[#202023] p-4 border-t border-[#9490A0] border-opacity-10 ">
                      <div className="relative text-gray-600 focus-within:text-gray-400">
                        <input
                          className="w-full h-[40px] pr-[20px] text-primary bg-[#EEEFF5] border border-[#EEEFF5] dark:bg-[#1B1B1E] placeholder-[#9490A0] placeholder:font-light dark:placeholder-[#616164] rounded-[10px] pl-[10px] shadow-inner "
                          placeholder="Please enter your team name"
                        />
                        <span className="absolute inset-y-0 right-0 flex items-center pl-2">
                          <XMarkIcon
                            className="w-6 h-6 px-1 hover:bg-gray-300 hover:text-primary cursor-pointer mr-1 rounded-lg flex justify-center items-center"
                            onClick={() => setEdit(false)}
                          />
                        </span>
                      </div>
                      <span className="text-xs text-[#9490A0] pl-[10px]">
                        Press Enter to validate
                      </span>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#18181B] p-4">
                      <button
                        className="rounded-[8px] bg-[#D7E1EB] dark:bg-[#202023] text-[16px] text-primary dark:text-white font-medium text-center w-[261px] h-[40px]"
                        onClick={() => {
                          setEdit(true);
                        }}
                      >
                        <div className="flex items-center justify-center">
                          <span className="mr-[11px]">
                            <PlusIcon className="text-primary dark:text-white font-bold w-[16px] h-[16px]" />
                          </span>
                          Create new team
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    </div>
  );
};
