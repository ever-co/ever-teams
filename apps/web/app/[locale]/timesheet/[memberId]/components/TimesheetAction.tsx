import { clsxm } from "@/app/utils";
import { TranslationHooks } from "next-intl";
import { ReactNode } from "react";
import { FaClipboardCheck } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { RiDeleteBin6Fill } from "react-icons/ri";
type ITimesheetButton = {
    title?: string,
    onClick?: () => void,
    className?: string,
    icon?: ReactNode

}
export const TimesheetButton = ({ className, icon, onClick, title }: ITimesheetButton) => {
    return (
        <button onClick={onClick} className={clsxm("flex items-center gap-1 text-gray-400 font-normal leading-3", className)}>
            <div className="w-[16px] h-[16px] text-[#293241]">
                {icon}
            </div>
            <span>{title}</span>
        </button>
    )
}


export type StatusType = "Pending" | "Approved" | "Rejected";
export type StatusAction = "Deleted" | "Approved" | "Rejected";


// eslint-disable-next-line @typescript-eslint/no-empty-function
export const getTimesheetButtons = (status: StatusType, t: TranslationHooks, onClick: (action: StatusAction) => void) => {

    const buttonsConfig: Record<StatusType, { icon: JSX.Element; title: string; action: StatusAction }[]> = {
        Pending: [
            { icon: <FaClipboardCheck className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED'), action: "Approved" },
            { icon: <IoClose className="!bg-[#2932417c] dark:!bg-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED'), action: "Rejected" },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'), action: "Deleted" }
        ],
        Approved: [
            { icon: <IoClose className="!bg-[#2932417c] dark:!bg-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED'), action: "Rejected" },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'), action: "Deleted" }
        ],
        Rejected: [
            { icon: <FaClipboardCheck className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED'), action: "Approved" },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'), action: "Deleted" }
        ]
    };

    return (buttonsConfig[status] || buttonsConfig.Rejected).map((button, index) => (
        <TimesheetButton
            className="hover:underline"
            key={index}
            icon={button.icon}
            onClick={() => onClick(button.action)}
            title={button.title}
        />
    ));
};

export const statusTable: { label: StatusType; description: string }[] = [
    { label: "Pending", description: "Awaiting approval or review" },
    { label: "Approved", description: "The item has been approved" },
    { label: "Rejected", description: "The item has been rejected" },
];
