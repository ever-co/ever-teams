import { IRegisterDataAPI } from "@app/interfaces/IAuthentication";
import { EMAIL_REGEX } from "./regex";

type Err = { [x in keyof IRegisterDataAPI]: string | undefined };

export const authFormValidate = (
  keys: (keyof IRegisterDataAPI)[],
  values: IRegisterDataAPI
) => {
  const err = {} as Err;
  keys.forEach((key) => {
    switch (key) {
      case "email":
        if (!EMAIL_REGEX.test(values["email"])) {
          err["email"] = "Please provide a properly formatted email address";
        }
        break;
      case "name":
        if (values["name"].trim().length < 2) {
          err["name"] = "You must provide a valid Name";
        }
        break;
      case "recaptcha":
        if (values["recaptcha"].trim().length < 2) {
          err["recaptcha"] =
            "Please check the ReCaptcha checkbox before continue";
        }
        break;
      case "team":
        if (values["team"].trim().length < 2) {
          err["team"] = "You must provide a valid Team Name";
        }
        break;
    }
  });

  return {
    valid: Object.keys(err).length === 0,
    errors: err,
  };
};
