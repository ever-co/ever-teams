import { Menu } from "electron";

export type IWindowTypes = 'SETTING_WINDOW' | 'LOG_WINDOW' | 'SETUP_WINDOW' | 'ABOUT_WINDOW'

export interface IAppWindow {
    windowType: IWindowTypes,
    menu: Menu
}
