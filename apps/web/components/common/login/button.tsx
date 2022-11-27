import React from "react";
import { IButtonProps } from "../../../app/interfaces/hooks";

const Button = ({ value }: IButtonProps) => {
  return (
    <button
      className="w-full my-1 px-4 py-2 h-[45px] tracking-wide text-white
        transition-colors duration-200 transform bg-primary
        dark:border dark:border-white rounded-[12px] hover:text-opacity-90 font-bold focus:outline-none"
      type="submit"
    >
      {value}
    </button>
  );
};

export default Button;
