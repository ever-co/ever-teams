export interface GrapesModel {
  cid: string;
  get(attr: string): any;
  set(attr: string, value: any): void;
  trigger(event: string): void;
  on(event: string, callback: () => void): void;
  getView(): any;
} 
