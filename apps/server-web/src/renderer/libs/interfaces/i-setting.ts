interface ISideMenu {
  displayName: string;
  key: string;
  isActive: boolean;
}

interface IUpdaterStates {
  state:
  | 'check-update'
  | 'update-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'not-started'
  | 'up-to-date'
  | 'cancel'
  ;
  data: any;
  label:
  | 'CHECKING'
  | 'DOWNLOADING'
  | 'QUIT_N_INSTALL'
  | 'UP_TO_DATE'
  | 'UPDATE_AVAILABLE'
  | 'CHECK_FOR_UPDATE';
}

interface IServerSetting {
  PORT: number;
  GAUZY_API_SERVER_URL: string;
  NEXT_PUBLIC_GAUZY_API_SERVER_URL: string;
  DESKTOP_WEB_SERVER_HOSTNAME?: string;
}

interface IPopup {
  type: 'success' | 'error' | 'none' | 'warning';
  isShow: boolean;
  isDialog: boolean;
}

interface ILanguages {
  code: string;
  label: string;
}

type IUpdateSetting = {
  autoUpdate: boolean;
  updateCheckPeriode: string;
};

type IAbout = {
  version: string;
};

type IGeneralSetting = {
  langs: ILanguages[];
  onChange: (lang: any) => void;
  lang: string;
};

type ISelectItems = {
  label: string;
  value: string;
};

type IRangeUpdates = {
  value: string;
  label: string;
};

export {
  ISideMenu,
  IUpdaterStates,
  IServerSetting,
  IPopup,
  ILanguages,
  IUpdateSetting,
  IAbout,
  IGeneralSetting,
  IRangeUpdates,
  ISelectItems
}
