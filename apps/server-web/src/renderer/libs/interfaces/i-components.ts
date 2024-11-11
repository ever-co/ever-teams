import { IUpdaterStates, IUpdateSetting, ISideMenu, ISelectItems, IServerSetting, ILanguages } from './i-setting';

type IToastComponent = {
  title: string;
  message: string;
  show: boolean;
  autoClose: boolean;
  timeout: number;
  type?: 'error' | 'success';
  onClose: () => void;
};

type IPopupComponent = {
  isShowPopup: boolean;
  modalAction: () => void;
  type: 'success' | 'error' | 'none' | 'warning';
  message: string;
  closeAction?: () => void;
};

type IProgressComponent = {
  updateStates: IUpdaterStates;
};

type IUpdaterComponent = {
  checkForUpdate: () => void;
  loading: boolean;
  updateStates: IUpdaterStates;
  Popup: JSX.Element;
  data: IUpdateSetting;
  changeAutoUpdate: (data: IUpdateSetting) => void;
  saveSettingUpdate: (data: IUpdateSetting) => void;
};

type ISelectComponent = {
  title: string;
  items: ISelectItems[];
  defaultValue: string;
  value: string;
  disabled: boolean;
  onValueChange: (val: string) => void;
};

type IServerComponent = {
  serverSetting: IServerSetting;
  saveSetting: (data: IServerSetting) => void;
  Popup: JSX.Element;
};

type ISidebarComponent = {
  children: string | JSX.Element | JSX.Element[];
  menus: ISideMenu[];
  menuChange: (key: string) => void;
  langs: ILanguages[];
  onLangChange: (lang: any) => void;
  lang: string;
};

export type IClassName<T = object> = {
  className?: string;
  fullWidth?: boolean;
  type?: 'VERTICAL' | 'HORIZONTAL';
} & T;

export {
  IToastComponent,
  IProgressComponent,
  IUpdaterComponent,
  ISelectComponent,
  IServerComponent,
  ISidebarComponent,
  IPopupComponent
}
