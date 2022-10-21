import React, { useCallback, useState } from "react";
import TeamLogo from "../components/common/team_logo";
import Footer from "../components/layout/footer/footer";
import Router from "next/router";
import FirstStep from "../components/team/steppers/firstStep";
import SecondStep from "../components/team/steppers/secondStep";
import {
  IRegisterData,
  ITeamProps,
  IUser,
  IUserData,
} from "../app/interfaces/IUserData";
import { register } from "../app/services/auth";
import Link from "next/link";

const FIRST_STEP = "STEP1";
const SECOND_STEP = "STEP2";

const initialValues: ITeamProps = {
  name: "",
  email: "",
  team: "",
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
      <div />
      <div className="w-[406px] mx-auto rounded-[40px] shadow-2xl bg-white p-10 dark:bg-dark_card_background_color dark:bg-opacity-30">
        <div className="flex justify-center w-full">
          <TeamLogo />
        </div>
        <div className="flex justify-center font-light text-center text-gray-600 dark:text-gray-400 w-full py-2">
          Visibility for your Team
        </div>
        <div className="text-xl font-bold text-label dark:text-white my-10">
          Create new Team
        </div>
        <form onSubmit={handleSubmit} method="post">
          {step === FIRST_STEP && (
            <FirstStep handleOnChange={handleOnChange} values={formValues} />
          )}
          {step === SECOND_STEP && (
            <SecondStep handleOnChange={handleOnChange} values={formValues} />
          )}
          <div className="mt-10 flex-col justify-between items-center">
            <button
              className="w-full my-4 px-4 py-2 tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-[12px] hover:text-opacity-90 focus:outline-none "
              type="submit"
            >
              {step === FIRST_STEP ? "Next" : "Create Team"}
            </button>
            <div className="w-full text-center underline text-primary cursor-pointer hover:text-primary dark:text-gray-400 dark:hover:opacity-90">
              {step === FIRST_STEP && (
                <Link href={"/passcode"}>Joining existed Team?</Link>
              )}
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Team;
