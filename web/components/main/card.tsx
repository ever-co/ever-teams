import { IMembers, IStartSection } from "../../app/interfaces/hooks";
import Image from "next/image";
import Separator from "../common/separator";
// import { PauseIcon } from "../common/main/pauseIcon";
// import { PlayIcon } from "../common/main/playIcon";
import DropdownUser from "@components/common/main/dropdown-user";
import { TimeInput } from "@components/common/main/time-input";
import { useState } from "react";

interface ICardProps extends IMembers, IStartSection {
  style: { width: string };
  length: number;
  i: number;
}

const Card = ({
  status,
  name,
  current,
  estimate,
  total,
  task,
  image,
  admin,
}: // started,
// setStarted,
ICardProps) => {
  const [nameEdit, setNameEdit] = useState(false);
  const [taskEdit, setTaskEdit] = useState(false);
  const [estimateEdit, setEstimateEdit] = useState(false);
  const [formValues, setFormValues] = useState({
    devName: name,
    devTask: task,
    estimateHours: estimate.hours,
    estimateMinutes: estimate.minutes,
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormValues((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleNameEdit = (e: any) => {
    setNameEdit(false);
  };

  const handleTaskEdit = (e: any) => {
    setTaskEdit(false);
  };

  const handleEstimate = () => {
    setEstimateEdit(true);
  };

  const handeEditBoth = () => {
    setNameEdit(true);
    setTaskEdit(true);
  };

  const bgColor =
    status === "working"
      ? "bg-[#02b102]"
      : status === "offline"
      ? "bg-[#de211e]"
      : "bg-[#DF7C00]";
  return (
    <div
      className={`w-full rounded-[15px] border ${
        admin
          ? " border-primary dark:border-gray-100 "
          : " hover:border hover:border-primary dark:border-[#202023]"
      } bg-[#FFFFFF] my-[15px] dark:bg-[#202023] flex 
    justify-between text-primary dark:hover:border-gray-100  
    font-bold py-[24px] dark:text-[#FFFFFF]`}
    >
      <div className="w-[60px]  flex justify-center items-center">
        <div className={`rounded-[50%] w-5 h-5 ${bgColor}`}></div>
      </div>
      <div className="w-[235px] h-[48px] flex items-center justify-center">
        <div className="flex justify-center items-center">
          <Image src={image} alt="User Icon" width={48} height={48} />
        </div>

        <div
          className="w-[137px] mx-[20px] h-[48px] flex justify-start items-center"
          onDoubleClick={() => {
            setNameEdit(true);
          }}
        >
          {nameEdit === true ? (
            <input
              value={formValues.devName}
              name="devName"
              onChange={handleChange}
              onKeyPress={(event) => {
                if (event.key === "Enter") {
                  handleNameEdit(this);
                }
              }}
              className="w-full h-[40px] rounded-lg px-2 shadow-inner border border-[#D7E1EB] dark:border-[#27272A]"
            />
          ) : (
            formValues.devName
          )}
        </div>
      </div>
      <Separator />
      <div
        className={`w-[334px]  h-[48px] font-light text-normal hover:rounded-[8px] hover:cursor-text`}
        onDoubleClick={() => {
          setTaskEdit(true);
        }}
      >
        {taskEdit === true ? (
          <textarea
            name="devTask"
            value={formValues.devTask}
            onChange={handleChange}
            onKeyPress={(event) => {
              if (event.key === "Enter") {
                handleTaskEdit(this);
              }
            }}
            className="w-full resize-none h-[48px] text-xs rounded-lg px-2 py-2 shadow-inner border border-[#D7E1EB] dark:border-[#27272A]"
          />
        ) : (
          <div
            className={`w-[334px]  h-[48px]  font-light text-normal px-[14px] border border-white dark:border-[#202023] hover:border-[#D7E1EB] dark:hover:border-[#27272A]  hover:rounded-[8px] hover:cursor-text`}
            onDoubleClick={() => {
              setTaskEdit(true);
            }}
          >
            {formValues.devTask}
          </div>
        )}
      </div>
      <Separator />
      <div className="w-[122px]  text-center flex justify-center items-center">
        {current}
        {/* {admin && (
          <div
            className="ml-[10px] cursor-pointer"
            onClick={() => setStarted(!started)}
          >
            {started ? (
              <PauseIcon width={24} height={24} />
            ) : (
              <PlayIcon width={24} height={24} />
            )}
          </div>
        )} */}
      </div>
      <Separator />
      <div className="w-[245px]  flex justify-center items-center">
        <div>
          <div className="flex w-[200px]">
            <div className="bg-[#28D581] w-[211px] h-[8px] rounded-l-full"></div>
            <div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[73px] h-[8px] rounded-r-full" />
          </div>
          <div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex items-center justify-center">
            <div>Estimate :</div>
            <TimeInput
              value={"" + formValues.estimateHours}
              type="string"
              placeholder="Hours"
              name="estimateHours"
              handleChange={handleChange}
              handleDoubleClick={handleEstimate}
              handleEnter={() => {
                setEstimateEdit(false);
              }}
              style={`${
                estimateEdit === true
                  ? " w-[30px] bg-[#F2F4FB] rounded-[6px] h-[30px] px-1 w-[42px]"
                  : "bg-transparent w-[20px]"
              } `}
              disabled={!estimateEdit}
            />
            h /
            <TimeInput
              value={"" + formValues.estimateMinutes}
              type="string"
              placeholder="Minutes"
              name="estimateMinutes"
              handleChange={handleChange}
              handleDoubleClick={handleEstimate}
              handleEnter={() => {
                setEstimateEdit(false);
              }}
              style={` ${
                estimateEdit === true
                  ? " w-[30px] bg-[#F2F4FB] rounded-[6px] h-[30px] px-1 w-[42px]"
                  : "bg-transparent w-[20px]"
              } `}
              disabled={!estimateEdit}
            />
            m
          </div>
        </div>
      </div>
      <Separator />
      <div className="w-[184px]  flex items-center">
        <div className="w-[177px] text-center text-"> {total}</div>
        <div className="mr-[20px]">
          <DropdownUser
            setEdit={handeEditBoth}
            setEstimateEdit={handleEstimate}
          />
        </div>
      </div>
    </div>
  );
};
export default Card;
