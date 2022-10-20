import React, { useCallback, useState } from "react";
import TeamLogo from "../components/common/team_logo";
import Footer from "../components/layout/footer/footer";
import Router from "next/router";
import { ITeamProps } from "../app/interfaces/IUserData";
import Input from "../components/common/input";
import Button from "../components/common/login/button";
import JoinTeamButton from "../components/common/login/join_team_button";

const FIRST_STEP = "STEP1";
const SECOND_STEP = "STEP2";

const initialValues: ITeamProps = {
  team: "",
  name: "",
  email: "",
};

const Team = () => {
  const [step, setStep] = useState(FIRST_STEP);
  const [formValues, setFormValues] = useState<ITeamProps>(initialValues);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (step === FIRST_STEP) {
      setStep(SECOND_STEP);
    } else {
      Router.push("/main");
    }
  };

  const handleOnChange = useCallback((e: any) => {
    const { name, value } = e.target;
    setFormValues((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);

  return (
    <div className="flex flex-col h-screen justify-between bg-main_background dark:bg-dark_background_color">
      <div className="invisible" />
      <div className="w-[446px] mx-auto rounded-[40px] bg-white p-12 dark:bg-dark_card_background_color dark:bg-opacity-30 shadow-2xl shadow-[#3E1DAD0D]">
        <div className="flex justify-left w-full">
          <TeamLogo />
        </div>
        <div className="flex font-light text-lg text-primary-light dark:text-gray-400 w-full ">
          Welcome! to Gauzy teams
        </div>
        <div className="text-xl font-bold text-label dark:text-white my-10">
          Create new Team
        </div>
        <form onSubmit={handleSubmit} method="post">
          <Input
            label="Team name"
            type="text"
            placeholder="Team Name"
            required={true}
            name="team"
            value={formValues.team}
            onChange={handleOnChange}
          />
          <Input
            label="User name"
            name="name"
            type="text"
            placeholder="User name"
            required={true}
            value={formValues.name}
            onChange={handleOnChange}
          />
          <Input
            label="Your email"
            name="email"
            type="email"
            placeholder="Your email"
            required={true}
            value={formValues.email}
            onChange={handleOnChange}
          />

          <div className="mt-10">
            <Button value="Create New Team" />
            <JoinTeamButton value="Join as Team member?" />
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Team;
