import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { Button, Card, Modal, Text } from 'lib/components';
import { ReloadIcon } from "@radix-ui/react-icons";
import React from "react";



interface AlertDialogConfirmationProps {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    loading?: boolean
}

export function AlertDialogConfirmation({
    title,
    description,
    confirmText = "Continue",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isOpen,
    onOpenChange,
    loading
}: AlertDialogConfirmationProps) {
    return (
        <AlertDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            defaultOpen={false}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={onCancel}
                        autoFocus
                    >
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className="px-4 py-2 text-sm hover:bg-red-600 hover:text-white font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
                        aria-label={loading ? "Confirming action..." : confirmText}
                        disabled={loading}
                        onClick={onConfirm}
                    >
                        {loading && (
                            <ReloadIcon className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {loading ? "Processing..." : confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}



export const AlertConfirmationModal = ({
    open,
    close,
    title,
    description,
    onAction,
    loading,
    confirmText = "Continue",
    cancelText = "Cancel",
    countID = 0
}: {
    open: boolean;
    close: () => void;
    onAction: () => any;
    title: string;
    description: string;
    loading: boolean;
    confirmText?: string;
    cancelText?: string;
    countID?: number
}) => {
    return (
        <>
            <Modal
                isOpen={open}
                closeModal={close}
                showCloseIcon={false}>
                <Card className="w-full md:min-w-[480px]" shadow="custom">
                    <div className="flex flex-col items-center justify-between">
                        <div className="flex flex-col">
                            <Text.Heading as="h3" className="text-2xl text-center">
                                {title}
                            </Text.Heading>
                            <div className="flex items-center gap-x-2">
                                <span className="text-center">
                                    {description}
                                </span>
                                {countID > 0 && <span className=" h-7 w-7 flex items-center justify-center text-center  text-xl rounded-full font-bold bg-primary dark:bg-primary-light text-white"> {countID}</span>}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-x-5 w-full mt-4">
                            <Button
                                type="button"
                                onClick={close}
                                className={'px-4 py-2 text-sm font-medium text-gray-700 dark:text-red-600 border rounded-md bg-light--theme-light dark:!bg-dark--theme-light'}
                            >
                                {cancelText}
                            </Button>
                            <Button
                                variant="danger"
                                type="submit"
                                className="px-4 py-2 text-sm hover:bg-red-600 hover:text-white font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
                                disabled={loading}
                                loading={loading}
                                onClick={() => {
                                    onAction()?.then(() => {
                                        close();
                                    });
                                }}>
                                {confirmText}
                            </Button>
                        </div>
                    </div>
                </Card>
            </Modal>
        </>
    );
};
