import { clsxm } from '@app/utils';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Modal } from 'lib/components'
import React from 'react'

interface ConfirmStatusChangeProps {
    isOpen?: boolean;
    newStatus?: string;
    oldStatus?: string
    closeModal?: () => void;
}
export function ConfirmStatusChange({ closeModal, isOpen, newStatus, oldStatus }: ConfirmStatusChangeProps) {

    const getStatusClasses = (status?: string) => {
        const classes: Record<string, string> = {
            Rejected: "text-red-500 border-red-500",
            Approved: "text-green-500 border-green-500",
            Pending: "text-orange-500 border-orange-500",
        };
        return status ? classes[status] || "text-gray-500 border-gray-200" : "text-gray-500 border-gray-200";
    };
    const newStatusClass = getStatusClasses(newStatus);
    const oldStatusClass = getStatusClasses(oldStatus);

    return (
        <Modal
            isOpen={isOpen ? isOpen : false}
            closeModal={closeModal ? closeModal : () => {}}
            title={"Confirm Change"}
            className="bg-light--theme-light text-xl0 dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start !shadow-2xl"
            titleClass="font-bold"
        >
            <div className='flex flex-col gap-y-4 items-center'>
                <span className='font-medium'>Time entry will be changed from</span>
                <StatusTransition
                    currentStatus={newStatus || ""}
                    previousStatus={oldStatus || ""}
                    currentStatusClass={newStatusClass}
                    previousStatusClass={oldStatusClass}
                />

                <CommentInputArea />
                <ConfirmationButtons onCancel={closeModal} />
            </div>
        </Modal>
    )
}


const StatusTransition = ({ previousStatus, currentStatus, currentStatusClass, previousStatusClass }: { previousStatus: string; currentStatus: string; currentStatusClass: string; previousStatusClass: string }) => (
    <div className="flex items-center gap-x-2 font-medium">
        <span className={clsxm(previousStatusClass, 'line-through font-normal')}>{previousStatus}</span>
        <span>to</span>
        <span className={clsxm(currentStatusClass)}>{currentStatus}</span>
    </div>
);

const ConfirmationButtons = ({ onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void }) => (
    <div className="flex items-center justify-between w-full gap-x-8">
        <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel
        </Button>
        <Button onClick={onConfirm} className="bg-primary dark:bg-primary-light w-full dark:text-white">
            Confirm
        </Button>
    </div>
);

const CommentInputArea = () => (
    <>
        <span className="text-center text-gray-400 text-sm">Add a comment for this change that the employee will see</span>
        <div className="flex flex-col w-full mt-2">
            <label className="block text-gray-400 text-sm">Comment (optional)</label>
            <textarea
                placeholder="Add comment"
                className="w-full resize-none p-2 border border-gray-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-32 placeholder:text-[14px]"
            />
        </div>
    </>
);


export function StatusBadge({ selectedStatus, filterNumber }: { selectedStatus?: string, filterNumber?: string }) {
    const [selected] = React.useState(selectedStatus);
    const getColorClass = () => {
        switch (selected) {
            case "Rejected":
                return `text-red-500 ${filterNumber ? "border-gray-200 dark:border-gray-700" : " border-red-500"} `;
            case "Approved":
                return `text-green-500 ${filterNumber ? "border-gray-200 dark:border-gray-700" : "border-green-500"}`;
            case "Pending":
                return `text-orange-500 ${filterNumber ? "border-gray-200 dark:border-gray-700" : "border-orange-500"} `;
            default:
                return `text-gray-500 dark:text-gray-200 border-gray-200 dark:border-gray-700 !py-0 font-normal`;
        }
    };

    return (
        <Badge className={`${getColorClass()} bg-transparent rounded-md ${filterNumber ? "font-normal" : 'py-1'}   px-2 text-center hover:bg-transparent`}
        >{filterNumber}{" "}{selected}</Badge>
    );
}
