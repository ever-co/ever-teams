import { clsxm } from "@/app/utils";
import { Modal } from "@/lib/components";
interface IRejectSelectedModalProps {
    isOpen: boolean;
    closeModal: () => void;
}
export function RejectSelectedModal({ isOpen, closeModal }: IRejectSelectedModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            showCloseIcon={false}
            closeModal={closeModal}
            title={'Reject Selected'}
            className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] justify-start"
            titleClass="font-bold">
            <div className="flex flex-col gap-4">
                <span className="text-[#71717A] text-center">
                    You are about to reject the selected entry, would you like to proceed?
                </span>
                <textarea
                    placeholder="Add reason here..."
                    className="bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent placeholder-gray-300 placeholder:font-normal resize-none p-2 grow border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-40"
                    maxLength={120}
                    minLength={0}

                />

                <div className="flex items-center gap-x-4 justify-end">
                    <button
                        onClick={closeModal}
                        type="button"
                        className="dark:text-primary border-[#E2E8F0] dark:border-slate-600 font-normal dark:bg-dark--theme-light h-[2.2rem] text-gray-700 border px-2 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={clsxm('bg-[#f33535] h-[2.2rem] font-normal flex items-center text-white px-2 rounded-lg')} >
                        Reject Entry
                    </button>
                </div>
            </div>
        </Modal>
    )
}
