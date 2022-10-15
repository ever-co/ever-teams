import React from "react";
import Input from "../../common/input";

interface ISecondStepProps {
  handleOnChange: any;
}

const SecondStep = ({ handleOnChange }: ISecondStepProps) => {

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
