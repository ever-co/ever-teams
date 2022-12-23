import { SiteReCAPTCHA } from "@components/services/recaptcha";
import React, { useEffect, useState } from "react";
import { IStepProps } from "../../../../app/interfaces/hooks";
import Input from "../../../common/input";

const SecondStep = ({
  handleOnChange,
  values,
  errors,
  showForm,
}: IStepProps & { errors?: { [x: string]: any }; showForm: boolean }) => {
  const [, setNotARobot] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");
  const [ierrors, setIErrors] = useState<{ [x: string]: string }>(errors || {});

  useEffect(() => {
    if (errors) setIErrors(errors);
  }, [errors]);

  return (
    <>
      {showForm && (
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
              errors={ierrors}
            />
          </div>
          <div className="mt-[30px]">
            <Input
              label="Your email"
              name="email"
              type="email"
              placeholder="Your Email"
              required={true}
              value={values.email}
              onChange={handleOnChange}
              errors={errors}
            />
          </div>
        </>
      )}

      <div className={`mt-[30px] ${showForm ? "" : "hidden"}`}>
        <SiteReCAPTCHA
          onChange={(res) => {
            handleOnChange({ target: { name: "recaptcha", value: res } });
            setNotARobot(true);
            setFeedback("");
          }}
          onErrored={() => setFeedback("network issue, please try again later")}
          onExpired={() => setNotARobot(false)}
        />
        {(ierrors["recaptcha"] || feedback) && (
          <span className="text-sm text-red-600 font-light">
            {ierrors["recaptcha"] || feedback}
          </span>
        )}
      </div>
    </>
  );
};

export default SecondStep;
