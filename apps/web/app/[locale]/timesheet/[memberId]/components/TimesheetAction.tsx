import { TimesheetStatus } from "@/app/interfaces";
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
    icon?: ReactNode,
    disabled?: boolean

}
export const TimesheetButton = ({ className, icon, onClick, title, disabled }: ITimesheetButton) => {
    return (
        <button disabled={disabled}
            onClick={onClick}
            className={clsxm("flex items-center gap-1 text-gray-400 font-normal leading-3", className)}>
            <div className="w-[16px] h-[16px] text-[#293241]">
                {icon}
            </div>
            <span>{title}</span>
        </button>
    )
}


export type StatusType = "Pending" | "Approved" | "Denied";
export type StatusAction = "Deleted" | "Approved" | "Denied";


// eslint-disable-next-line @typescript-eslint/no-empty-function
export const getTimesheetButtons = (status: StatusType, t: TranslationHooks, disabled: boolean, onClick: (action: StatusAction) => void) => {

    const buttonsConfig: Record<StatusType, { icon: JSX.Element; title: string; action: StatusAction }[]> = {
        Pending: [
            { icon: <FaClipboardCheck className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED'), action: "Approved" },
            { icon: <IoClose className="!bg-[#2932417c] dark:!bg-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED'), action: "Denied" },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'), action: "Deleted" }
        ],
        Approved: [
            { icon: <IoClose className="!bg-[#2932417c] dark:!bg-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED'), action: "Denied" },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'), action: "Deleted" }
        ],
        Denied: [
            { icon: <FaClipboardCheck className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED'), action: "Approved" },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] dark:!text-gray-400 rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'), action: "Deleted" }
        ]
    };

    return (buttonsConfig[status] || buttonsConfig.Denied).map((button, index) => (
        <TimesheetButton
            className="hover:underline text-sm gap-2"
            disabled={disabled}
            key={index}
            icon={button.icon}
            onClick={() => onClick(button.action)}
            title={button.title}
        />
    ));
};

export const statusTable: { label: TimesheetStatus; description: string }[] = [
    { label: "PENDING", description: "Awaiting approval or review" },
    { label: "IN REVIEW", description: "The item has been approved" },
    { label: "APPROVED", description: "The item has been approved" },
    { label: "DRAFT", description: "The item is saved as draft" },
    { label: "DENIED", description: "The item has been rejected" },
];
