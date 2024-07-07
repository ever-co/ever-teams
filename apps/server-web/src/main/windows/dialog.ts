import { dialog } from 'electron';

interface InfoMessageBox {
    title: string;
    body: string;
    action: () => void;
}
export const InfoMessagesBox = async (options: InfoMessageBox) => {
    const infoMessage = await dialog.showMessageBox({
        message: options.body,
        title: options.title,
        type: 'info',
        buttons: ['Ok', 'Close']
    })
    if (infoMessage.response === 0) {
        await options.action();
    }
    return;
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
