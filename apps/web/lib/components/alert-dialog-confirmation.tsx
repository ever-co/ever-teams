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
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
                        aria-label={loading ? "Confirming action..." : confirmText}
                        disabled={loading} onClick={onConfirm}
                    >
                        {!loading && (
                            <ReloadIcon className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {loading ? "Processing..." : confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
