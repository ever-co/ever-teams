import { ChangeEventHandler, ReactNode } from 'react';
import { IRegisterDataAPI } from './IAuthentication';
import { ITeamTask } from './ITask';
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
	onChange?: ChangeEventHandler<HTMLInputElement>;
	value: string;
	centered?: boolean;
	errors?: { [x: string]: any };
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
	estimate: { hours: number; minutes: number };
	total: string;
	image?: any;
	admin?: boolean;
}

//Invite props interface
export interface IInviteProps {
	isOpen: boolean;
	Fragment: any;
	closeModal: any;
	task: ITeamTask | null;
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
	values: IRegisterDataAPI;
}

// Login button props
export interface IButtonProps {
	value: string;
}

// Login button props
export interface IButtonProps {
	value: string;
}

// Start and Pause button props
export interface IIconProps {
	width: number;
	height: number;
}

// Start section props
export interface IStartSection {
	started: boolean;
	setStarted: React.Dispatch<React.SetStateAction<boolean>>;
}
//Dropdown Data props
export interface IDrowDownData {
	name: string;
	color: string;
}

export type IClassName<T = object> = {
	className?: string;
	fullWidth?: boolean;
	type?: 'VERTICAL' | 'HORIZONTAL';
} & T;

export type Nullable<T> = T | null | undefined;

export interface IInviteEmail {
	title: string;
	name: string;
}
