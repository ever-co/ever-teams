import React from "react";
import Input from "../../common/input";

const SecondStep = () => {
  return (
    <>
      <Input
        label="Your name"
        name="name"
        type="text"
        placeholder="Your name"
        required={true}
      />
      <Input
        label="Your email"
        name="email"
        type="email"
        placeholder="example@domain.com"
        required={true}
      />
    </>
  );
};

export default SecondStep;
