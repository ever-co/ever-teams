import { IMembers, IStartSection } from "../../app/interfaces/hooks";
import Image from "next/image";
import Separator from "../common/separator";
import { PauseIcon } from "../common/main/pauseIcon";
import { PlayIcon } from "../common/main/playIcon";
import DropdownUser from "@components/common/main/dropdown-user";
import { TimeInput } from "@components/common/main/time-input";
import { useState } from "react";
import Link from "next/link";
import StatusDropdown from "@components/common/main/status-dropdown";
// import { PauseIcon } from "@heroicons/react/20/solid";

const ProfileCard = () => {
  return (
    <div
      className={`w-full rounded-[10px] border ${" border-primary dark:border-[#202023]"} bg-[#FFFFFF] my-[15px] dark:bg-[#202023] 
  justify-between  dark:hover:border-gray-100  
  font-bold pt-[2px] pb-6 px-[24px] dark:text-[#FFFFFF]`}
    >
      <div className="flex justify-end">
        <div className="flex  space-x-[100px] text-slate-500 text-[12px]">
          <div className="order-1 ">
            <h1>Worked Time</h1>
          </div>
          <div className="order-2">
            <h1>Estimate</h1>
          </div>
          <div className="order-3">
            <h1>Status</h1>
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="w-[334px]  h-[48px] font-light text-normal hover:rounded-[8px] hover:cursor-text">
          <div className="w-[334px]  h-[48px]  font-light text-normal px-[14px] border border-white dark:border-[#202023] hover:border-[#D7E1EB] dark:hover:border-[#27272A]  hover:rounded-[8px] hover:cursor-text">
            Open Platform for On-Demand and Sharing Economies
          </div>
        </div>
        <div className="w-[122px] text-center flex justify-center items-center">
          01:10
        </div>
        <div className="w-[245px] flex justify-center items-center">
          <div>
            <div className="flex w-[200px]">
              <div className="bg-[#28D581] w-[211px] h-[8px] rounded-l-full"></div>
              <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[73px] h-[8px] rounded-r-full"></div>
            </div>
            <div className="text-center text-[14px] text-[#9490A0] py-1 font-light flex items-center justify-center">
              <div>Estimate :</div>
              <input
                className="placeholder:font-light text-[14px] text-center border-b-2 dark:border-[#616164] border-dashed outline-none  placeholder:text-center bg-transparent w-[20px]"
                placeholder="Hours"
                name="estimateHours"
                type="string"
                disabled
                value="12"
              />
              h /
              <input
                className="placeholder:font-light text-[14px] text-center border-b-2 dark:border-[#616164] border-dashed outline-none  placeholder:text-center  bg-transparent w-[20px]"
                placeholder="Minutes"
                name="estimateMinutes"
                type="string"
                disabled
                value="20"
              />{" "}
              m
            </div>
          </div>
        </div>
        <div>
          <StatusDropdown />
        </div>
      </div>
    </div>
  );
};
export default ProfileCard;
