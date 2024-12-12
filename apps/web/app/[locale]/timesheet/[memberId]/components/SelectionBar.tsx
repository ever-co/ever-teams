import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type ActionButtonProps = {
    label: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const ActionButton = ({ label, onClick }: ActionButtonProps) => (
    <button
        className="bg-white font-semibold h-8 px-3 rounded-lg text-[#282048] dark:text-white dark:bg-primary-light"
        onClick={onClick}
    >
        {label}
    </button>
);

interface SelectionBarProps {
    fullWidth: boolean;
    selectedCount: number;
    onApprove: () => void;
    onReject: () => void;
    onDelete: () => void;
    onClearSelection: () => void;
}

export const SelectionBar = ({
    fullWidth,
    selectedCount,
    onApprove,
    onReject,
    onDelete,
    onClearSelection
}: SelectionBarProps) => {
    const t = useTranslations()
    return (
        <div
            className={cn(
                "bg-[#E2E2E2CC] fixed dark:bg-slate-800 opacity-85 h-16 z-50  bottom-5 left-1/2 transform -translate-x-1/2 shadow-lg rounded-2xl flex items-center justify-between gap-x-4 px-4",
                fullWidth && "x-container"
            )}
        >
            <div className="flex items-center justify-start gap-x-4">
                <div className="flex items-center justify-center gap-x-2 text-[#282048] dark:text-[#7a62d8]">
                    <div className="bg-primary dark:bg-primary-light text-white rounded-full h-7 w-7 flex items-center justify-center font-bold">
                        <span>{selectedCount}</span>
                    </div>
                    <span>selected</span>
                </div>
                <ActionButton
                    label={t("pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED")}
                    onClick={onApprove}
                />
                <ActionButton
                    label={t("pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED")}
                    onClick={onReject}
                />
                <ActionButton
                    label={t("pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED")}
                    onClick={onDelete}
                />
            </div>
            <button
                onClick={onClearSelection}
                className="font-semibold h-8 px-3 rounded-lg text-[#3826A6] dark:text-primary-light"
                aria-label="Clear Selection"
            >
                Clear Selection
            </button>
        </div>
    )
}
