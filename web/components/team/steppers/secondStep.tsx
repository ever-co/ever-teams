import React, { useState } from "react";
import { IStepProps } from "../../../app/interfaces/hooks";
import { Iframe } from "../../common/IFrame/iFrame";
import Input from "../../common/input";

const SecondStep = ({ handleOnChange, values }: IStepProps) => {
  const [notARobot, setNotARobot] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");
  return (
    <>
      <div className="mt-[30px]">
        <Input
          label="Your name"
          name="name"
          type="text"
          placeholder="Your name"
          required={true}
          value={values.name}
          onChange={handleOnChange}
        />
      </div>
      <div className="mt-[30px]">
        <Input
          label="Your email"
          name="email"
          type="email"
          placeholder="example@domain.com"
          required={true}
          value={values.email}
          onChange={handleOnChange}
        />
      </div>
      <div className="mt-[30px]">
        <Iframe
          onChange={() => {
            setNotARobot(true);
            setFeedback("");
          }}
          onErrored={() => setFeedback("network issue, please try again later")}
          onExpired={() => setNotARobot(false)}
        />
      </div>
    </>
  );
};

export default SecondStep;
