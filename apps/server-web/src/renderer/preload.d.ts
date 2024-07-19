import { ElectronHandler, languageChange } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    languageChange: languageChange;
  }
}

export {};
