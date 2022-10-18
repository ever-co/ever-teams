import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import InputEmail from "../team/passcode/inputEmail";
import TeamLogo from "../common/team_logo";

interface IInviteProps {
  isOpen: boolean;
  Fragment: any;
  closeModal: any;
}

interface IInvite {
  email: string;
  name: string;
}

const initalValues: IInvite = {
  email: "",
  name: "",
};
const Invite = ({ isOpen, Fragment, closeModal }: IInviteProps) => {
  const [formData, setFormData] = useState<IInvite>(initalValues);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    closeModal();
  };
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex my-5 justify-center w-full">
                  <TeamLogo />
                </div>
                <div className="text-primary text-center text-bold">
                  Invite member to your channel
                </div>
                <div className="text-center text-sm text-gray-700 my-3">
                  Send invitation links to team member
                </div>
                <form onSubmit={handleSubmit} method="post">
                  <div className="mt-10">
                    <div className="text-center text-sm w-full text-gray-500 my-2">
                      Your email
                    </div>
                    <InputEmail
                      name="email"
                      type="email"
                      placeholder="example@domain.com"
                      required={true}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="mt-10">
                    <div className="text-center text-sm w-full text-gray-500 my-2">
                      Team Member Name
                    </div>
                    <InputEmail
                      name="name"
                      type="text"
                      placeholder="Member name"
                      required={true}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="mb-5 flex justify-between items-center">
                    <div />
                    <button
                      className="w-1/2 my-4 px-4 py-2 tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-md hover:opacity-90 focus:outline-none"
                      type="submit"
                    >
                      Invite
                    </button>
                    <div />
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Invite;
