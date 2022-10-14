import React from "react";
import Input from "../../common/input";

const FirstStep = () => {
  return (
    <Input
      label="Team name"
      type="text"
      placeholder="Gauzy team"
      required={true}
      name="name"
    />
  );
};

export default FirstStep;
