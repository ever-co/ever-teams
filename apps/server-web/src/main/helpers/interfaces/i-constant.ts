export type Channels = 'setting-page' | 'ipc-renderer' | 'language-set' | 'updater-page' | 'server-page' | 'theme-change' | 'current-theme' | 'current-language' | 'get-platform' | 'control-button';

export type PlatformStyle = {
  bgColor: string;
  rounded: string;
  sideBar: string;
  sideServer: string;
  maxHeight: {
    maxHeight?: string;
  };
  boxContent: string;
}

export type CustomStyle = {
  WINDOWS: PlatformStyle;
  MAC: PlatformStyle;
}

export type IDevices = 'win32' | 'darwin' | 'linux';
