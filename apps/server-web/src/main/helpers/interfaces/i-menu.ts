import { MenuItemConstructorOptions } from 'electron';
export interface AppMenu {
    id?: string;
    label: string; // Menu label
    submenu?: (AppMenu | ElectronMenuItem)[]; // Nested menus or Electron menu items
    role?: 'appMenu' | 'fileMenu' | 'editMenu' | 'viewMenu' | 'windowMenu' | 'help'; // Predefined menu roles
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'; // Menu item type
    click?: () => void; // Click handler for the menu item
    accelerator?: string; // Keyboard shortcut
    enabled?: boolean; // Whether the item is enabled
    visible?: boolean; // Whether the item is visible
    checked?: boolean; // For 'checkbox' or 'radio' type
  }

  export type ElectronMenuItem = MenuItemConstructorOptions;
