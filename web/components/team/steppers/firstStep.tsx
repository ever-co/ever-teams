import React from "react";
import { IStepProps } from "../../../app/interfaces/hooks";
import Input from "../../common/input";

const FirstStep = ({ handleOnChange, values }: IStepProps) => {
  return (
    <Input
      label="Team name"
      type="text"
      placeholder="Please enter your team name"
      required={true}
      name="team"
      value={values.team}
      onChange={handleOnChange}
    />
  );
};

export default FirstStep;
