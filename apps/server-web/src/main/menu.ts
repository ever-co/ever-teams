import {
  app,
  Menu,
  shell,
} from 'electron';
import { config } from '../configs/config';
import { EventEmitter } from 'events';
import { EventLists } from './helpers/constant';
import i18n from 'i18next';
import { AppMenu } from './helpers/interfaces';

export default class MenuBuilder {
  eventEmitter: EventEmitter

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
  }

  defaultMenu(): AppMenu[] {
    const isDarwin = process.platform === 'darwin';
    return [
      {
        id: 'MENU_APP',
        label: config.DESCRIPTION || app.getName(),
        submenu: [
          {
            id: 'MENU_APP_ABOUT',
            label: `MENU_APP.APP_ABOUT`,
            selector: 'orderFrontStandardAboutPanel:',
            click: () => {
              this.eventEmitter.emit(EventLists.gotoAbout)
            }
          },
          { type: 'separator' },
          {
            id: 'MENU_APP_QUIT',
            label: 'MENU_APP.APP_QUIT',
            accelerator: isDarwin ? 'Command+Q' : 'Alt+F4',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        id: 'MENU_APP_WINDOW',
        label: 'MENU_APP.APP_WINDOW',
        submenu: [
          {
            id: 'SUBMENU_SETTING',
            label: 'MENU_APP.APP_SUBMENU.APP_SETTING',
            click: () => {
              this.eventEmitter.emit(EventLists.gotoSetting);
            }
          },
          {
            id: 'SUBMENU_SERVER',
            label: 'MENU_APP.APP_SUBMENU.APP_SERVER_WINDOW',
            click: () => {
              this.eventEmitter.emit(EventLists.SERVER_WINDOW);
            }
          }
        ]
      },
      {
        id: 'MENU_APP_HELP',
        label: 'MENU_APP.APP_HELP',
        submenu: [
          {
            id: 'SUBMENU_LEARN_MORE',
            label: 'MENU_APP.APP_SUBMENU.APP_LEARN_MORE',
            click() {
              shell.openExternal(config.COMPANY_SITE_LINK);
            },
          },
          {
            id: 'SUBMENU_DOC',
            label: 'MENU_APP.APP_SUBMENU.APP_DOC',
            click() {
              shell.openExternal(
                config.COMPANY_GITHUB_LINK
              );
            },
          },
        ],
      },
      {
        id: 'MENU_APP_DEV',
        label: 'MENU_APP.APP_DEV',
        submenu: [
          {
            id: 'SUBMENU_SETTING_DEV',
            label: 'MENU_APP.APP_SUBMENU.APP_SETTING_DEV',
            click: () => {
              this.eventEmitter.emit(EventLists.SETTING_WINDOW_DEV);
            },
          },
          {
            id: 'SUBMENU_SERVER_DEV',
            label: 'MENU_APP.APP_SUBMENU.APP_SERVER_DEV',
            click: () => {
              this.eventEmitter.emit(EventLists.SERVER_WINDOW_DEV);
            },
          },
        ]
      },
    ]
  }

  buildDefaultTemplate(menuItems: any, i18nextMainBackend: typeof i18n) {
    return Menu.buildFromTemplate(this.translateAppMenu(i18nextMainBackend, menuItems));
  }

  updateAppMenu(menuItem: string, context: { label?: string, enabled?: boolean}, contextMenuItems: any, i18nextMainBackend: typeof i18n) {
    const menuIdx:number = contextMenuItems.findIndex((item: any) => item.id === menuItem);
    if (menuIdx > -1) {
        contextMenuItems[menuIdx] = {...contextMenuItems[menuIdx], ...context};
        const newMenu = [...contextMenuItems];
        Menu.setApplicationMenu(Menu.buildFromTemplate(this.translateAppMenu(i18nextMainBackend, newMenu)));
    } else {
      const newMenu = [...contextMenuItems];
      Menu.setApplicationMenu(Menu.buildFromTemplate(this.translateAppMenu(i18nextMainBackend, newMenu)))
    }
}

translateAppMenu(i18nextMainBackend: typeof i18n, contextMenu: any) {
  return contextMenu.map((menu: any) => {
    const menuCopied = {...menu};
    if (menuCopied.label) {
      menuCopied.label = i18nextMainBackend.t(menuCopied.label);
    }
    if (menuCopied.submenu && menuCopied.submenu.length) {
      menuCopied.submenu = menuCopied.submenu.map((sm: any) => {
        const submenu = {...sm};
        if (submenu.label) {
          submenu.label = i18nextMainBackend.t(submenu.label)
        }
        return submenu;
      })
    }
    return menuCopied;
  })
}
}
