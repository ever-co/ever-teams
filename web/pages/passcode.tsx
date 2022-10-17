import React from "react";
import Input from "../components/common/input";
import TeamLogo from "../components/common/team_logo";
import Footer from "../components/layout/footer/footer";

const Passcode = () => {
  const handleChange = () => {};
  const handleSubmit = (e: any) => {
    e.preventDefault();
  };
  return (
    <div className="flex flex-col h-screen justify-between bg-white dark:bg-dark_background_color">
      <div />
      <div className="w-[476px] mx-auto rounded bg-white p-10 dark:bg-dark_card_background_color dark:bg-opacity-30">
        <div className="flex justify-center w-full">
          <TeamLogo />
        </div>
        <div className="flex justify-center font-light text-center text-gray-600 dark:text-gray-400 w-full py-2">
          Welcome to Gauzy team
        </div>
        <div className="text-xl text-center font-bold text-label dark:text-white my-10">
          Join Our Team
        </div>
        <form onSubmit={handleSubmit} method="post">
          <div className="text-sm text-center text-gray-700">
            Please enter the invitation code we sent to your Email
          </div>
          <div>
            <input className="" />
          </div>
          <div className="text-center text-sm my-5">
            <span>Didn’t receive code ? </span>
            <span className="text-primary font-bold">Resend code</span>
          </div>
          <div>
            {" "}
            <Input
              label="Your email"
              name="email"
              type="email"
              placeholder="example@domain.com"
              required={true}
              onChange={handleChange}
            />
          </div>
          <div className="mb-5 flex justify-between items-center">
            <button
              className="w-1/2 my-4 px-4 py-2 tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-md hover:opacity-90 focus:outline-none"
              type="submit"
            >
              Join Team
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};
export default Passcode;
