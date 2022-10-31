import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { PlusIcon } from "@heroicons/react/24/solid";

interface ITask {
  id: number;
  name: string;
}
const tasks: ITask[] = [
  { id: 1, name: "API Integration" },
  { id: 2, name: "Design Profile Screen" },
  { id: 3, name: "Improve Main Page Design" },
];

export default function Example() {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const filteredPeople =
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
              {filteredPeople.length === 0 && query !== "" ? (
                <div className="relative cursor-pointer select-none py-2 px-4 text-gray-700">
                  <div className="flex items-center justify-start cursor-pointer text-primary dark:text-white">
                    <span className="mr-[11px]">
                      <PlusIcon className=" font-bold w-[16px] h-[16px]" />
                    </span>
                    Create new
                  </div>
                </div>
              ) : (
                filteredPeople.map((person) => (
                  <Combobox.Option
                    key={person.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active
                          ? "bg-[#F9FAFB] text-primary dark:text-white dark:bg-[#202023] cursor-pointer"
                          : "text-gray-900 dark:text-white"
                      }`
                    }
                    value={person}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? "font-medium" : "font-normal"
                          }`}
                        >
                          {person.name}
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
