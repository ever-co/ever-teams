import React from "react";
import Input from "../../common/input";

interface IFirstStepProps {
  handleOnChange: any;
}

const FirstStep = ({ handleOnChange }: IFirstStepProps) => {
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
