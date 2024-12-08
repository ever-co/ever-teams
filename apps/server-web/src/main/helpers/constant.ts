import { Channels } from './interfaces'
export const EventLists = {
  webServerStarted: 'WEB_SERVER_STARTED',
  webServerStopped: 'WEB_SERVER_STOPPED',
  webServerStart: 'WEB_SERVER_START',
  webServerStop: 'WEB_SERVER_STOP',
  gotoSetting: 'GO_TO_SETTING',
  gotoAbout: 'GO_TO_ABOUT',
  OPEN_WINDOW: 'OPEN_WINDOW',
  UPDATE_AVAILABLE: 'UPDATE_AVAILABLE',
  UPDATE_ERROR: 'UPDATE_ERROR',
  UPDATE_NOT_AVAILABLE: 'UPDATE_NOT_AVAILABLE',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  UPDATE_DOWNLOADED: 'UPDATE_DOWNLOADED',
  UPDATE_CANCELLED: 'UPDATE_CANCELLED',
  CHANGE_LANGUAGE: 'CHANGE_LANGUAGE',
  OPEN_WEB: 'OPEN_WEB',
  SERVER_WINDOW: 'SERVER_WINDOW',
  RESTART_SERVER: 'RESTART_SERVER',
  CHANGE_THEME: 'CHANGE_THEME',
  SETUP_WINDOW: 'SETUP_WINDOW',
  SETTING_WINDOW_DEV: 'SETTING_WINDOW_DEV',
  SERVER_WINDOW_DEV: 'SERVER_WINDOW_DEV',
  WINDOW_EVENT: 'WINDOW_EVENT'
}

export const SettingPageTypeMessage = {
  loadSetting: 'load-setting',
  checkUpdate: 'check-for-update',
  updateAvailable: 'update-available',
  downloadingUpdate: 'downloading-update',
  downloaded: 'downloaded-update',
  installUpdate: 'install-update',
  saveSetting: 'save-setting',
  updateError: 'update-error',
  upToDate: 'up-to-date',
  mainResponse: 'main-response',
  showVersion: 'show-version',
  selectMenu: 'select-menu',
  langChange: 'lang',
  updateSetting: 'update-setting',
  updateSettingResponse: 'update-setting-response',
  updateCancel: 'update-cancel',
  restartServer: 'restart-server',
  themeChange: 'theme-change'
}

export const ServerPageTypeMessage = {
  SERVER_STATUS: 'server-status',
  SERVER_EXEC: 'server-exec'
}

export const LOG_TYPES = {
  UPDATE_LOG: 'UPDATE-LOG',
  SERVER_LOG: 'SERVER-LOG'
}

export const IPC_TYPES: {
  SETTING_PAGE: Channels,
  UPDATER_PAGE: Channels,
  SERVER_PAGE: Channels
} = {
  SETTING_PAGE: 'setting-page',
  UPDATER_PAGE: 'updater-page',
  SERVER_PAGE: 'server-page'
}

export const WindowOptions = {
  SETTING_WINDOW: {
    width: 1024,
    height: 728,
    hashPath: 'setting'
  },
  LOG_WINDOW: {
    width: 1024,
    height: 728,
    hashPath: 'history-console'
  },
  SETUP_WINDOW: {
    width: 1024,
    height: 728,
    hashPath: 'setup'
  },
  ABOUT_WINDOW: {
    width: 300,
		height: 250,
    hashPath: 'about'
  }
}

export const WindowTypes: {
  SETTING_WINDOW: 'SETTING_WINDOW',
  LOG_WINDOW: 'LOG_WINDOW',
  SETUP_WINDOW: 'SETUP_WINDOW',
  ABOUT_WINDOW: 'ABOUT_WINDOW'
} = {
  SETTING_WINDOW: 'SETTING_WINDOW',
  LOG_WINDOW: 'LOG_WINDOW',
  SETUP_WINDOW: 'SETUP_WINDOW',
  ABOUT_WINDOW: 'ABOUT_WINDOW'
}
