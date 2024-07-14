import { autoUpdater } from 'electron-updater';
import EventEmitter from 'events';
import { EventLists } from './helpers/constant';
import { InfoMessagesBox } from './windows/dialog';
import i18n from 'i18next';

class AppUpdater {
  constructor(eventEmitter: EventEmitter, i18nextMainBackend: typeof i18n) {
    autoUpdater.logger = console;
    autoUpdater.on('update-available', (info) => {
      eventEmitter.emit(EventLists.UPDATE_AVAILABLE, info);
      if (!autoUpdater.autoDownload) {
        InfoMessagesBox({
          title: '',
          body: i18nextMainBackend.t('MESSAGE.UPDATE_AVAILABLE'),
          btnLabel: {
            ok: i18nextMainBackend.t('FORM.BUTTON.DOWNLOAD_NOW'),
            close: i18nextMainBackend.t('FORM.BUTTON.LATER')
          }
        }).then((resDialog) => {
          if (resDialog.response === 0) {
            autoUpdater.downloadUpdate();
          } else {
            eventEmitter.emit(EventLists.UPDATE_CANCELLED, info);
          }
        })
      }
    })

    autoUpdater.on('error', (message) => {
      eventEmitter.emit(EventLists.UPDATE_ERROR, message);
    })

    autoUpdater.on('update-not-available', (info) => {
      eventEmitter.emit(EventLists.UPDATE_NOT_AVAILABLE, info);
    })

    autoUpdater.on('download-progress', (info) => {
      eventEmitter.emit(EventLists.UPDATE_PROGRESS, info);
    })

    autoUpdater.on('update-downloaded', (data) => {
      eventEmitter.emit(EventLists.UPDATE_DOWNLOADED, data);
    })

    autoUpdater.on('update-cancelled', (info) => {
      eventEmitter.emit(EventLists.UPDATE_CANCELLED, info);
    })

    // autoUpdater.on('')
    //   autoUpdater.checkForUpdatesAndNotify();
  }

  checkUpdate() {
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdates();
  }

  checkUpdateNotify() {
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();
  }

  installUpdate() {
    autoUpdater.quitAndInstall();
  }
}

export default AppUpdater;
