import { ReactNode } from "react";
import { ITeamProps } from "./IUserData";
//Dropdown props interface
export interface IDropDownProps {
  data: string[];
  selectedData: string;
  handleSelectData: any;
}

//Input props interface
export interface IInputProps {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  required: boolean;
  onChange: any;
  value: string;
}

//Header props interface
export interface IHeader {
  style: any;
}

//Members interface
export interface IMembers {
  name: string;
  status: string;
  task: string;
  current: string;
  estimate: string;
  total: string;
}

//Invite props interface
export interface IInviteProps {
  isOpen: boolean;
  Fragment: any;
  closeModal: any;
}

//Invite interface
export interface IInvite {
  email: string;
  name: string;
}

//AppLayout Props interface
export interface AppLayoutProps {
  children: ReactNode;
  additionalClass?: string;
}

//Meta props interface
export interface MetaProps {
  title: string;
  keywords: string;
  description: string;
}

//Input Email interface
export interface IInputEmail {
  name: string;
  type: string;
  placeholder: string;
  required: boolean;
  onChange: any;
}

//Step props interface
export interface IStepProps {
  handleOnChange: any;
  values: ITeamProps;
}

// Login button props
export interface IButtonProps {
  value: string;
}
