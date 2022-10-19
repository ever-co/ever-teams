import React from "react";
import { IInputEmail } from "../../../app/interfaces/hooks";

export const InputEmail = ({
  name,
  type,
  placeholder,
  required,
  onChange,
}: IInputEmail) => {
  return (
    <div className="mb-5">
      {" "}
      <input
        type={type}
        name={name}
        id={name}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className="w-full text-center rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base font-medium text-[#6B7280] outline-none focus:border-[#7D56fd] focus:border focus:shadow-md dark:bg-dark_background_color"
      />
    </div>
  );
};

export default InputEmail;
