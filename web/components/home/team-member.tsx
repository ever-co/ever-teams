import Header from "./header";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { IMembers } from "../../app/interfaces/hooks";

export function TeamMemberSection() {
  return <TeamList />;
}

const members: IMembers[] = [
  {
    name: "Raslan Kanviser",
    status: "working",
    task: "Similique et soluta voluptatem voluptatem. Dolor facere eos sit nisi ipsa eveniet.",
    current: "2:15:30",
    estimate: "4:05:00",
    total: " 05:20:59",
  },
  {
    name: "Ramesh Jena",
    status: "inactive",
    task: "Creating the main time recording screen and user table",
    current: "1:40:00",
    estimate: "5:00:00",
    total: "04:10:10",
  },
  {
    name: "Peace Sundri",
    status: "offline",
    task: "Non cumque rem. Tempore ut esse. Delectus accusantium voluptate voluptas.",
    current: "0:30:00",
    estimate: "2:00:00",
    total: "07:34:30",
  },
];

function TeamList() {
  const style = { width: `${100 / members.length}%` };
  return (
    <div className="p-0 overflow-x-auto mt-9">
      <div className="py-6">
        <h5 className=" mb-0 capitalize text-lg text-slate-400 font-semibold leading-tight">
          Team members
        </h5>
      </div>
      <ul className="items-center w-full mb-0 align-top text-slate-500">
        <Header style={style} />
        {members.map((item, i) => {
          const bgColorOp =
            item.status === "working"
              ? "bg-[#02b1028a]"
              : item.status === "offline"
              ? "bg-[#de211e8a]"
              : "bg-[#DF7C008a]";
          const bgColor =
            item.status === "working"
              ? "bg-[#02b102]"
              : item.status === "offline"
              ? "bg-[#de211e]"
              : "bg-[#DF7C00]";
          return (
            <li
              key={i}
              className="bg-white hover:border hover:border-primary dark:hover:border-gray-100 card__bg-color flex justify-between px-5 py-2 mb-3 items-center rounded-xl"
            >
              <div
                style={style}
                className="pr-2 align-middle bg-transparent whitespace-nowrap shadow-transparent"
              >
                <div className="flex pr-2 py-1">
                  <EllipsisVerticalIcon
                    className="h-7 w-7 text-gray-300 cursor-pointer"
                    aria-hidden="true"
                  />
                  <div className="mr-2 flex items-center">
                    <div className={`rounded-[50%] w-5 h-5 ${bgColor}`}></div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h6 className=" mb-0 text-base leading-normal dark:text-white dark:opacity-80">
                      {item.name}
                    </h6>
                  </div>
                </div>
              </div>
              <div
                style={style}
                className="p-2 mb-0 text-xs font-normal leading-tight text-slate-400 dark:text-white dark:opacity-80"
              >
                {item.task}
              </div>
              <div
                style={style}
                className="text-sm font-semibold dark:text-white dark:opacity-80 leading-normal text-center align-middle bg-transparent whitespace-nowrap shadow-transparent"
              >
                {item.current}
              </div>
              <div style={style}>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className={`${bgColorOp} h-2.5 rounded-full`}
                    style={{ width: `${(members.length - 1 - i) * 35}%` }}
                  ></div>
                  <div className="text-xs text-gray-400 text-center py-2">
                    Estimate : {item.estimate}
                  </div>
                </div>
              </div>
              <div
                style={style}
                className="text-center align-middle bg-transparent whitespace-nowrap shadow-transparent"
              >
                <span className="text-sm font-semibold dark:text-white dark:opacity-80 leading-tight">
                  {item.total}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
