import Image from "next/image";
import { useState } from "react";
import { AppLayout } from "@components/layout";
import Timer from "@components/common/main/timer";
import ProfileCard from "@components/home/profile-card";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import useAuthenticateUser from "@app/hooks/useAuthenticateUser";
import { Capitalize } from "@components/layout/header/profile";
import Link from "next/link";

interface ITimerTasksSection {
  started: boolean;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
}
const style = { width: `${100 / 10}%` };

const Profile = () => {
  const { user } = useAuthenticateUser();
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<"worked" | "assigned" | "unassigned">(
    "worked"
  );

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#18181B]">
      <AppLayout>
        <div className="bg-[#FFFF] dark:bg-[#202023] mt-[100px] rounded-[20px] w-full flex items-center justify-between">
          <div className="ml-[16px] mb-[20px] flex flex-col space-y-[15px]">
            <div className="w-[171px] bg-[#ACB3BB] mt-[20px] mb-2 text-[18px] text-[#FFFFFF] rounded-[8px] px-[17px] py-[5px] flex items-center cursor-pointer hover:opacity-80">
              <ChevronLeftIcon className="w-[15px] mr-[10px]" />
              <Link href="/main">Back to Team</Link>
            </div>
            <div className="flex items-center mb-[100px]">
              <div className="relative">
                <Image
                  src={user?.imageUrl || ""}
                  alt="User Icon"
                  width={137}
                  height={137}
                  className="rounded-full "
                />

                <div className="absolute rounded-full bg-white p-[1px] top-[8px] right-[1px] flex items-center justify-center cursor-pointer">
                  <Image
                    src="/assets/png/edit.png"
                    width={26}
                    height={26}
                    alt="edit icon"
                  />
                </div>
                <div className="absolute rounded-full bg-white p-[1px] top-[100px] right-[5px]">
                  <div className="bg-[#02C536] w-[22px] h-[22px] rounded-full"></div>
                </div>
              </div>
              <div className="ml-[24px]">
                <div className="text-[30px] text-[#1B005D] font-bold flex items-center ">
                  <span className="flex items-center">
                    {user?.firstName && Capitalize(user.firstName)}
                    {user?.lastName && " " + Capitalize(user.lastName)}
                  </span>
                  <span className="ml-[15px] flex items-center cursor-pointer">
                    <Image
                      src="/assets/png/edit.png"
                      width={26}
                      height={26}
                      alt="edit icon"
                    />
                  </span>
                </div>
                <div className="text-[#B0B5C7] flex items-center">
                  <span className="flex items-center">{user?.email}</span>
                  <span className="ml-[15px] flex items-center cursor-pointer">
                    <Image
                      src="/assets/png/edit.png"
                      width={26}
                      height={26}
                      alt="edit icon"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center items-center space-x-[27px] mr-[27px] w-1/2 ml-[48px]">
            <Timer started={started} setStarted={setStarted} />
          </div>
        </div>

        <div className="my-[41px] text-[18px] text-[#ACB3BB] font-light flex">
          <div
            className={`mr-10 ${
              tab === "worked" && "font-medium"
            } cursor-pointer`}
            onClick={() => setTab("worked")}
          >
            Worked
            {tab === "worked" && (
              <div className="w-[65px] h-[2px] bg-[#ACB3BB]" />
            )}
          </div>
          <div
            className={`mr-10 ${
              tab === "assigned" && "font-medium"
            } cursor-pointer`}
            onClick={() => setTab("assigned")}
          >
            Assigned
            {tab === "assigned" && (
              <div className="w-[78px] h-[2px] bg-[#ACB3BB]" />
            )}
          </div>
          <div
            className={`mr-10 ${
              tab === "unassigned" && "font-medium"
            } cursor-pointer`}
            onClick={() => setTab("unassigned")}
          >
            Unassigned
            {tab === "unassigned" && (
              <div className="w-[98px] h-[2px] bg-[#ACB3BB]" />
            )}
          </div>
        </div>
        <div className="flex">
          <div>
            <p>Now</p>
          </div>
          <div className="flex-1 mt-4">
            <hr />
          </div>
          <div className="flex-2">
            <p>Total Time : 03:31</p>
          </div>
        </div>
        <div>
          <ProfileCard style={style} />
        </div>
      </AppLayout>
    </div>
  );
};

export default Profile;
