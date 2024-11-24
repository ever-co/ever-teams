export interface AppMenu {
    id?: string;
    label?: string;
    click?: () => void;
    submenu?: AppSubMenu[]
}

export interface AppSubMenu {
    id?: string;
    label?: string;
    click?: () => void;
    selector?: string;
    type?: string;
    accelerator?: string;
}
