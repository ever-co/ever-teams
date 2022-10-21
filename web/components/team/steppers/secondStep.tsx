import React from "react";
import { IStepProps } from "../../../app/interfaces/hooks";
import Input from "../../common/input";

const SecondStep = ({ handleOnChange, values }: IStepProps) => {
  return (
    <>
      <Input
        label="Your name"
        name="name"
        type="text"
        placeholder="Your name"
        required={true}
        value={values.name}
        onChange={handleOnChange}
      />
      <Input
        label="Your email"
        name="email"
        type="email"
        placeholder="example@domain.com"
        required={true}
        value={values.email}
        onChange={handleOnChange}
      />
    </>
  );
};

export default SecondStep;
