import React from "react";
import { IHeader } from "../../app/interfaces/hooks";

const Header = ({ style }: IHeader) => {
  return (
    <li className="flex justify-between px-5 py-2 mb-3 items-center rounded-md">
      <div
        style={style}
        className="text-sm pr-2 text-left text-primary dark:text-white dark:opacity-80 font-bold bg-transparent whitespace-nowrap shadow-transparent"
      >
        <div className="flex space-x-4 pr-2 py-1">
          <div className="">Status</div>
          <div className="">Name</div>
        </div>
      </div>
      <div
        style={style}
        className="text-sm font-bold p-2 mb-0 leading-tight text-primary dark:text-white dark:opacity-80"
      >
        Task
      </div>
      <div
        style={style}
        className="text-sm text-primary font-bold text-center dark:text-white dark:opacity-80 leading-normal align-middle bg-transparent whitespace-nowrap shadow-transparent"
      >
        Current
      </div>
      <div style={style}>
        <div className="text-sm text-primary font-bold  dark:text-white dark:opacity-80">
          Estimate
        </div>
      </div>
      <div
        style={style}
        className="text-center text-sm text-primary  dark:text-white dark:opacity-80 font-bold align-middle bg-transparent whitespace-nowrap shadow-transparent"
      >
        Total
      </div>
    </li>
  );
};
export default Header;
