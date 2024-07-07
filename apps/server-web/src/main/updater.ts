import { autoUpdater,  } from 'electron-updater';
import log from 'electron-log';
import EventEmitter from 'events';
import { EventLists } from './helpers/constant';

class AppUpdater {
    constructor(eventEmitter: EventEmitter) {
      log.transports.file.level = 'info';
      autoUpdater.logger = log;
      autoUpdater.on('update-available', (info) => {
        eventEmitter.emit(EventLists.UPDATE_AVAILABLE, info);
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
    //   autoUpdater.checkForUpdatesAndNotify();
    }

    checkUpdate() {
        autoUpdater.checkForUpdates();
    }

    installUpdate() {
      autoUpdater.quitAndInstall();
    }
}

export default AppUpdater;
