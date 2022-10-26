import { Popover, Transition } from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";

const DropdownUser = () => {
  return (
    <Popover className="relative border-none no-underline">
      {({ open }) => (
        <>
          <Popover.Button className="border-none active:border-none no-underline">
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
            <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[96px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl">
              <div className="bg-white shadow dark:bg-[#18181B] p-[16px] rounded-[10px] text-[14px] font-light">
                <button>Edit</button>
                <button className="mt-2">Release</button>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default DropdownUser;
