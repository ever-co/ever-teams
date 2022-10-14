import React from "react";
import TeamLogo from "../components/common/team_logo";
import Footer from "../components/layout/footer/footer";
import Router from "next/router";

const Team = () => {
  const handleSubmit = (e: any) => {
    e.preventDefault();
    Router.push("/main");
  };
  return (
    <div className="flex flex-col h-screen justify-between bg-white dark:bg-dark_background_color">
      <div></div>
      <div className="w-[476px] mx-auto rounded drop-shadow-md bg-white p-10 dark:bg-dark_card_background_color dark:bg-opacity-30">
        <div className="flex justify-center w-full">
          <TeamLogo />
        </div>
        <div className="flex justify-center font-light text-center text-gray-600 dark:text-gray-400 w-full py-2">
          Welcome to Gauzy team
        </div>
        <div className="text-xl font-bold text-label dark:text-white my-10">
          Create new Team
        </div>
        <form onSubmit={handleSubmit} method="post">
          <div className="mb-5">
            <label
              htmlFor="email"
              className="mb-3 block text-base font-medium text-label dark:text-gray-400"
            >
              Team name:
            </label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Gauzy team"
              required
              className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base font-medium text-[#6B7280] outline-none focus:border-primary focus:shadow-md dark:bg-dark_background_color"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="email"
              className="mb-3 block text-base font-medium text-label dark:text-gray-400"
            >
              Your email :
            </label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="example@domain.com"
              required
              className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base font-medium text-[#6B7280] outline-none focus:border-primary focus:shadow-md dark:bg-dark_background_color"
            />
          </div>

          <div className="mb-5 flex justify-between items-center">
            <div className="underline text-label cursor-pointer hover:text-primary dark:text-gray-400 dark:hover:opacity-90">
              Join as Team member ?
            </div>
            <button
              className="w-1/2 my-4 px-4 py-2 tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-md hover:opacity-90 focus:outline-none"
              type="submit"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Team;
