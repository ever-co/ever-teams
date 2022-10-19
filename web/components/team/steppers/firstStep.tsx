import React from "react";
import { IStepProps } from "../../../app/interfaces/hooks";
import Input from "../../common/input";

const FirstStep = ({ handleOnChange }: IStepProps) => {
  return (
    <Input
      label="Team name"
      type="text"
      placeholder="Gauzy team"
      required={true}
      name="firstName"
      onChange={handleOnChange}
    />
  );
};

export default FirstStep;
