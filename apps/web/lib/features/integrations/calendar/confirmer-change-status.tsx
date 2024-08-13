import { Modal } from 'lib/components'
import React from 'react'

interface ConfirmStatusChangeProps {
    isOpen?: boolean;
    newStatus?: string;
    oldStatus?: string
    closeModal?: () => void;
}
export function ConfirmStatusChange({ closeModal, isOpen, newStatus, oldStatus }: ConfirmStatusChangeProps) {
    return (
        <Modal
            isOpen={isOpen!}
            closeModal={closeModal!}
            title={"Confirm Change"}
            className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start shadow-xl"
            titleClass="font-bold"
        >
            <div className='flex flex-col gap-y-4'>
                <span className='font-medium'>Time entry will be changed from</span>
                <div>
                    <span className='font-medium'>Time entry will be changed from</span>
                    <span className='font-medium'>Time entry will be changed from</span>
                </div>
                <span>Add a comment for this change that the employee will see</span>

                <div className="flex flex-col">
                    <label className="block text-gray-500 shrink-0">Comment (optional)</label>
                    <textarea
                        placeholder="What worked on? "
                        className="w-full resize-none p-2 grow border border-gray-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-32"
                    />
                </div>
            </div>
        </Modal>
    )
}
