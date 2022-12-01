import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { IInvite, IInviteProps } from "../../app/interfaces/hooks";
import UserIcon from "../common/invite/userIcon";
import Input from "../common/input";
import { useTeamInvitations } from "@app/hooks/features/useTeamInvitations";
import { Spinner } from "@components/common/spinner";
import { AxiosError } from "axios";

const initalValues: IInvite = {
  email: "",
  name: "",
};
const Invite = ({ isOpen, Fragment, closeModal }: IInviteProps) => {
  const [formData, setFormData] = useState<IInvite>(initalValues);
  const { invateUser, inviteLoading } = useTeamInvitations();
  const [errors, setErrors] = useState({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setErrors((er) => {
      return {
        ...er,
        [name]: "",
      };
    });
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    invateUser(formData.email, formData.name)
      .then(() => {
        setFormData(initalValues);
        closeModal();
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 400) {
          setErrors((err.response?.data as any)?.errors || {});
        }
      });
  };
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
              <Dialog.Panel className="w-full px-[70px] py-[46px] max-w-md transform overflow-hidden rounded-[40px] bg-white dark:bg-[#18181B] text-left align-middle shadow-xl transition-all">
                <div className="flex justify-center items-center w-full">
                  <UserIcon />
                </div>
                <div className="text-primary dark:text-white mt-[22px] text-center font-bold text-[22px]">
                  Invite member to your team
                </div>
                <div className="font-light w-full mt-[5px] text-[14px] text-[#ACB3BB] text-center">
                  Send an invitation to a team member by email
                </div>

                <form
                  onSubmit={handleSubmit}
                  method="post"
                  className="mt-[50px]"
                >
                  <Input
                    name="email"
                    type="email"
                    label="Team Member's Email"
                    placeholder="example@domain.com"
                    required={true}
                    value={formData.email}
                    onChange={handleChange}
                    errors={errors}
                  />

                  <div className="mt-[30px]">
                    <Input
                      name="name"
                      type="text"
                      label="Team Member's Full Name"
                      placeholder="Team Member's Full Name"
                      value={formData.name}
                      required={true}
                      onChange={handleChange}
                      errors={errors}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <div />
                    <button
                      className="w-full flex justify-center items-center mt-10 px-4 font-bold h-[55px] py-2 rounded-[12px] tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white hover:text-opacity-90 focus:outline-none text-[18px]"
                      type="submit"
                      disabled={inviteLoading}
                    >
                      <span>Send Invite</span>{" "}
                      {inviteLoading && (
                        <span className="ml-2">
                          <Spinner />
                        </span>
                      )}
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
