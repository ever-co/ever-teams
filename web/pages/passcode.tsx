import React, { useState } from "react";
import Input from "../components/common/input";
import LockIcon from "../components/common/passcode/lockIcon";
import Footer from "../components/layout/footer/footer";
import InputCode from "../components/team/passcode/inputCode";

const Passcode = () => {
  const [formValues, setFormValues] = useState({ email: "" });
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormValues((prevState) => ({ ...prevState, [name]: value }));
  };
  const handleSubmit = (e: any) => {
    e.preventDefault();
  };
  return (
    <div className="flex flex-col h-screen justify-between bg-main_background dark:bg-dark_background_color">
      <div />
      <div className="w-[426px] mx-auto rounded-[40px] shadow-2xl bg-white p-10 dark:bg-dark_card_background_color dark:bg-opacity-30">
        <div className="flex justify-center w-full">
          <div className="p-10 bg-[#F5F6FB] rounded-full">
            <LockIcon />
          </div>
        </div>
        <div className="text-2xl text-center text-[#1B005D] font-bold dark:text-white my-10">
          Join existed Team
        </div>
        <form onSubmit={handleSubmit} method="post">
          <div className="text-sm font-light text-center text-[#ACB3BB] w-full p-0">
            Please enter the invitation code we sent to your Email
          </div>
          <div className="my-6 flex justify-between">
            <InputCode />
            <InputCode />
            <InputCode />
            <InputCode />
            <InputCode />
            <InputCode />
          </div>
          <div className="text-center text-sm my-5">
            <span className="text-[#ACB3BB]">Didn’t receive code? </span>
            <span className="text-primary dark:text-white font-medium cursor-pointer">
              Resend code
            </span>
          </div>
          <div className="mt-10">
            <Input
              label="Your Email"
              type="email"
              placeholder="Please enter your email"
              required={true}
              name="email"
              value={formValues.email}
              onChange={handleChange}
              centered={true}
            />
          </div>
          <div className="mb-5 flex justify-between items-center">
            <div />
            <button
              className="w-full mt-10 px-4 py-2 font-bold tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-[12px] hover:opacity-90 focus:outline-none"
              type="submit"
            >
              Join Team
            </button>
            <div />
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};
export default Passcode;
