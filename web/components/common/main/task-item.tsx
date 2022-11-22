import { ITeamTask } from "@app/interfaces/ITask";
import Image from "next/image";
import { BadgedTaskStatus } from "./dropdownIcons";
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { useTeamTasks } from "@app/hooks/useTeamTasks";
import { Spinner } from "../spinner";

export function TaskItem({
  selected,
  item,
  active,
  onDelete,
  onReopen,
}: {
  selected: boolean;
  item: ITeamTask;
  active: boolean;
  onDelete: () => void;
  onReopen: () => void;
}) {
  const { updateLoading } = useTeamTasks();
  return (
    <>
      <span
        className={`truncate h-[30px] flex items-center ${
          selected ? "font-medium" : "font-normal"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          {item.title} #{item.taskNumber}
          <div className="flex items-center space-x-4">
            <BadgedTaskStatus status={item.status} />
            <div className="flex items-center justify-center space-x-1">
              {item.members &&
                item.members.map((member, i) => (
                  <div className="flex justify-center items-center" key={i}>
                    <Image
                      src={member.user?.imageUrl || ""}
                      alt={
                        (member.user?.firstName || "") +
                        " " +
                        (member.user?.lastName || "")
                      }
                      width={30}
                      height={30}
                    />
                  </div>
                ))}{" "}
            </div>
            {item.status === "Closed" ? (
              updateLoading ? (
                <Spinner dark={false} />
              ) : (
                <ArrowPathIcon
                  className="w-5 h-5 text-gray-400 hover:text-primary dark:hover:text-white"
                  onClick={onReopen}
                />
              )
            ) : (
              <XMarkIcon
                className="w-5 h-5 text-gray-400 hover:text-primary dark:hover:text-white"
                onClick={onDelete}
              />
            )}
          </div>
        </div>
      </span>
      {selected ? (
        <span
          className={`absolute inset-y-0 left-0 flex items-center dark:text-white text-primary pl-3`}
        >
          <CheckIcon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );
}
