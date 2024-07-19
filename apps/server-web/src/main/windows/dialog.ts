import { dialog } from 'electron';

interface InfoMessageBox {
    title: string;
    body: string;
    action?: () => void;
    actionClose?: () => void;
    btnLabel: {
        ok: string;
        close: string;
    }
}
export const InfoMessagesBox = async (options: InfoMessageBox) => {
    return dialog.showMessageBox({
        message: options.body,
        title: options.title,
        type: 'info',
        buttons: [options.btnLabel.ok, options.btnLabel.close]
    })
}

interface ErrorMessageBox {
    title: string;
    body: string;
    action: () => void;
}
export const ErrorMessagesBox = async (options: ErrorMessageBox) => {
    await dialog.showMessageBox({
        message: options.body,
        title: options.title,
        type: 'error',
        buttons: ['Ok']
    })
}
