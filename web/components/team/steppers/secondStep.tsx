import React from "react";
import { IStepProps } from "../../../app/interfaces/hooks";
import Input from "../../common/input";

const SecondStep = ({ handleOnChange }: IStepProps) => {
  return (
    <>
      <Input
        label="Your name"
        name="lastName"
        type="text"
        placeholder="Your name"
        required={true}
        onChange={handleOnChange}
      />
      <Input
        label="Your email"
        name="email"
        type="email"
        placeholder="example@domain.com"
        required={true}
        onChange={handleOnChange}
      />
    </>
  );
};

export default SecondStep;
