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
      <div className="w-[436px] mx-auto py-[50px] px-[70px]  rounded-[40px] shadow-2xl bg-white dark:bg-dark_card_background_color dark:bg-opacity-30">
        <div className="flex justify-center w-full">
          <div className=" bg-[#F5F6FB] rounded-full p-8">
            <LockIcon />
          </div>
        </div>
        <div className="text-[22px] mt-[30px] text-center text-[#1B005D] font-bold dark:text-white">
          Join existed Team
        </div>
        <form onSubmit={handleSubmit} method="post">
          <div className="text-[14px] mt-[30px] font-light text-center text-[#ACB3BB] w-full p-0">
            Please enter the invitation code we sent to your Email
          </div>
          <div className="mt-[21px] flex justify-between">
            <InputCode />
            <InputCode />
            <InputCode />
            <InputCode />
            <InputCode />
            <InputCode />
          </div>
          <div className="text-center text-[14px] mt-[21px]">
            <span className="text-[#ACB3BB] font-light">
              Didn’t receive code?{" "}
            </span>
            <span className="text-primary dark:text-white font-medium cursor-pointer">
              Resend code
            </span>
          </div>
          <div className="mt-[40px]">
            <Input
              label="Your Email"
              type="email"
              placeholder="Your email"
              required={true}
              name="email"
              value={formValues.email}
              onChange={handleChange}
              centered={true}
            />
          </div>
          <div className="flex justify-between items-center">
            <div />
            <button
              className="w-full h-[55px] text-[18px] mt-10 font-bold 
              tracking-wide text-white dark:text-primary transition-colors 
              duration-200 transform bg-primary dark:bg-white rounded-[12px] 
              hover:text-opacity-90 focus:outline-none"
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
