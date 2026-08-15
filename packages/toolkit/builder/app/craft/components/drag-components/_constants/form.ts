/**
 * Form component related default props
 */
import { marginpaddingObj } from './layout';

// Define constants
const inputProps = {
	placeholder: 'Type here...',
	fontSize: 14,
	inputType: 'text',
	margin: {
		t: 0,
		r: 0,
		b: 0,
		l: 0,
		isMultiple: false,
		all: 0
	},
	padding: {
		t: 8,
		r: 12,
		b: 8,
		l: 12,
		isMultiple: true,
		all: 0
	},
	color: '#000000',
	opacity: 100,
	fontDecoration: 'none',
	align: 'left',
	borderRadius: 6,
	borderColor: '#e2e8f0',
	borderWidth: 1,
	backgroundColor: 'white',
	shadow: false,
	showLabel: false,
	label: 'Input Label',
	labelPosition: 'top',
	labelSize: 14,
	labelColor: '#000000',
	labelWeight: '500',
	required: false
};

const selectDropdownProps = {
	label: 'Select',
	selectedValue: '',
	align: 'left',
	...marginpaddingObj,
	color: '#000000',
	backgroundColor: '#ffffff',
	borderRadius: 4,
	borderColor: '#e2e8f0',
	borderWidth: 1,
	shadow: false,
	opacity: 100,
	list: [
		{
			label: 'Option 1',
			value: 'option1'
		},
		{
			label: 'Option 2',
			value: 'option2'
		},
		{
			label: 'Option 3',
			value: 'option3'
		}
	],
	icon: ''
};

const checkboxProps = {
	checked: false,
	title: 'Accept terms and conditions',
	description: 'You agree to our Terms of Service and Privacy Policy.',
	hideDescription: false,
	...marginpaddingObj,
	align: 'left'
};

const calendarProps = {
	className: '',
	showOutsideDays: false
};

// Export as named exports
export {
	inputProps as InputDefaultProps,
	selectDropdownProps as SelectDropdownDefaultProps,
	checkboxProps as CheckboxDefaultProps,
	calendarProps as calendarDefaultProps
};
