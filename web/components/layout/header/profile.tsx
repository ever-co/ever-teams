import useAuthenticateUser from "@app/hooks/useAuthenticateUser";
import Image from "next/image";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface IOption {
  name: string;
  handleClick: any;
}

const Profile = () => {
  const { logOut, user } = useAuthenticateUser();

  const options: IOption[] = [
    {
      name: "Profile",
      handleClick: () => {},
    },
    {
      name: "Settings",
      handleClick: () => {},
    },

    {
      name: "Logout",
      handleClick: logOut,
    },
  ];

  return (
    <Popover className="relative border-none no-underline">
      {({ open }) => (
        <>
          <Popover.Button className="p-0 m-0 outline-none mt-1">
            <div className="flex justify-center items-center cursor-pointer">
              <Image
                src={user?.imageUrl || ""}
                alt="User Icon"
                width={48}
                height={48}
                className="rounded-full flex items-center justify-center"
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
            <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[200px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl shandow">
              <div className="bg-white shadow dark:bg-[#18181B] rounded-[10px] text-[14px] font-light">
                {options.map((option) => (
                  <button
                    key={option.name}
                    onClick={option.handleClick}
                    className="hover:bg-gray-100 dark:hover:bg-[#202023] dark:hover:text-white py-2 px-4 mt-1 flex items-center text-gray-600 dark:text-gray-200 justify-start w-full"
                  >
                    {option.name}
                  </button>
                ))}
              </div>{" "}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default Profile;
