import React, { useCallback, useState } from "react";
import TeamLogo from "../components/common/team_logo";
import Footer from "../components/layout/footer/footer";
import Router from "next/router";
import FirstStep from "../components/team/steppers/firstStep";
import SecondStep from "../components/team/steppers/secondStep";
import { IRegisterData, IUser, IUserData } from "../app/interfaces/IUserData";
import { register } from "../app/services/auth";

const FIRST_STEP = "STEP1";
const SECOND_STEP = "STEP2";

const initialValues: IUser = {
  fullName: "",
  email: "",
};

const Team = () => {
  const [step, setStep] = useState(FIRST_STEP);
  const [formValues, setFormValues] = useState<IUser>(initialValues);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (step === FIRST_STEP) {
      setStep(SECOND_STEP);
    } else {
      Router.push("/main");
      // const passwordRandom = Math.random().toString(36).slice(2, 10);
      // const userData: IRegisterData = { user: formValues, password: passwordRandom, confirmPassword: passwordRandom }
      // register(userData);
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
    <div className="flex flex-col h-screen justify-between bg-white dark:bg-dark_background_color">
      <div />
      <div className="w-[476px] mx-auto rounded bg-white p-10 dark:bg-dark_card_background_color dark:bg-opacity-30">
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
          {step === FIRST_STEP && <FirstStep handleOnChange={handleOnChange} />}
          {step === SECOND_STEP && (
            <SecondStep handleOnChange={handleOnChange} />
          )}
          <div className="mb-5 flex justify-between items-center">
            <div className="underline text-label cursor-pointer hover:text-primary dark:text-gray-400 dark:hover:opacity-90">
              Join as Team member ?
            </div>
            <button
              className="w-1/2 my-4 px-4 py-2 tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-md hover:opacity-90 focus:outline-none"
              type="submit"
            >
              {step === FIRST_STEP ? "Next" : "Create Team"}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Team;
