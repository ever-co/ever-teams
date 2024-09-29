import { ElectronHandler, languageChange, themeChange } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    languageChange: languageChange;
    themeChange: themeChange;
  }
}

export { };
