import React, { useCallback, useState } from "react";
import TeamLogo from "../components/common/team_logo";
import Footer from "../components/layout/footer/footer";
import Router from "next/router";
import FirstStep from "../components/team/steppers/firstStep";
import SecondStep from "../components/team/steppers/secondStep";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
    console.log("dotenv : ", process.env.CAPTCHA_SITE_KEY);
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
      <div
        className="w-[486px] py-[50px] px-[70px] mx-auto rounded-[40px] shadow-2xl bg-white
       dark:bg-dark_card_background_color dark:bg-opacity-30"
      >
        <div className="flex justify-center w-full">
          <TeamLogo />
        </div>
        <div className="flex justify-center text-[#ACB3BB] font-light text-center text-[18px] w-full mt-[10px]">
          Visibility for your Team
        </div>
        <div className="text-[24px]  mt-[30px] font-bold text-primary dark:text-white">
          Create new Team
        </div>
        <form onSubmit={handleSubmit} method="post">
          {step === FIRST_STEP && (
            <FirstStep handleOnChange={handleOnChange} values={formValues} />
          )}
          {step === SECOND_STEP && (
            <SecondStep handleOnChange={handleOnChange} values={formValues} />
          )}
          <div className="mt-[40px] flex justify-between items-center">
            <div className="w-1/2 justify-between underline text-primary cursor-pointer hover:text-primary dark:text-gray-400 dark:hover:opacity-90">
              {step === FIRST_STEP && (
                <Link href={"/passcode"}>Joining existed Team?</Link>
              )}

              {step === SECOND_STEP && (
                <ArrowLeftIcon
                  className="h-[30px] text-[#0200074D] hover:text-primary cursor-pointer"
                  aria-hidden="true"
                  onClick={() => {
                    setStep(FIRST_STEP);
                  }}
                />
              )}
            </div>
            <button
              className="w-1/2 h-[50px] my-4 tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-[12px] hover:text-opacity-90 focus:outline-none "
              type="submit"
            >
              {step === FIRST_STEP ? "Continue" : "Create Team"}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Team;
