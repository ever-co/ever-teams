import { clsxm } from "@/app/utils";
import { useTranslations } from "next-intl";
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

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const getTimesheetButtons = (status: StatusType) => {
    const t = useTranslations();
    const buttonsConfig: Record<StatusType, { icon: JSX.Element; title: string }[]> = {
        Pending: [
            { icon: <FaClipboardCheck className="!text-[#2932417c] rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED') },
            { icon: <IoClose className="!bg-[#2932417c] rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED') },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED') }
        ],
        Approved: [
            { icon: <IoClose className="!bg-[#2932417c] rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED') },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED') }
        ],
        Rejected: [
            { icon: <FaClipboardCheck className="!text-[#2932417c] rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED') },
            { icon: <RiDeleteBin6Fill className="!text-[#2932417c] rounded" />, title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED') }
        ]
    };

    return (buttonsConfig[status] || buttonsConfig.Rejected).map((button, index) => (
        <TimesheetButton
            key={index}
            icon={button.icon}
            onClick={() => {
                // TODO: Implement the onClick functionality
            }}
            title={button.title}
        />
    ));
};
