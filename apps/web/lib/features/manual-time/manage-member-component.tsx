import { clsxm } from '@/app/utils';
import { CustomCombobox } from '@/core/components/combobox';
import React from 'react';

/**
 * Represents an item with dynamic properties.
 * @interface Item
 */
export interface Item {
	[key: string]: any; // Allows for dynamic properties
}

/**
 * Props interface for the ManageOrMemberComponent component.
 * @interface ManageOrMemberComponentProps
 */
interface ManageOrMemberComponentProps {
	/**
	 * An array of field definitions for the component.
	 * Each field specifies the label, placeholder, whether it's required, and keys for value and display.
	 * @type {Object[]}
	 * @property {string} label - The label for the field.
	 * @property {string} element - The element for the field.
	 * @property {string} placeholder - The placeholder text for the field.
	 * @property {boolean} isRequired - Indicates if the field is required.
	 * @property {string} valueKey - The key to extract the value of the item.
	 * @property {string} displayKey - The key to extract the display value of the item.
	 */
	fields: {
		label: string;
		element: string;
		placeholder: string;
		isRequired: boolean;
		valueKey: string; // Key for extracting the item's value
		displayKey: string; // Key for extracting the item's display text
		defaultValue?: string;
	}[];

	/**
	 * A dictionary of item lists for each field.
	 * The key corresponds to the field label, and the value is an array of items or undefined.
	 * @type {Object.<string, Item[] | undefined>}
	 */
	itemsLists: { [key: string]: Item[] | undefined };

	/**
	 * A dictionary of currently selected values for each field.
	 * The key corresponds to the field label, and the value is the selected item or null.
	 * @type {Object.<string, Item | null>}
	 */
	selectedValues: { [key: string]: Item | null };

	/**
	 * Callback function to handle changes in selected values.
	 * @param {Object.<string, Item | null>} values - The updated selected values for each field.
	 */
	onSelectedValuesChange: (values: { [key: string]: Item | null }) => void;

	/**
	 * Optional callback function to handle additional logic when a value changes.
	 * @param {string} field - The label of the field where the change occurred.
	 * @param {Item | null} selectedItem - The newly selected item or null.
	 */
	handleChange?: (field: string, selectedItem: Item | null) => void;

	/**
	 * Function to convert an item to a display string based on the displayKey.
	 * @param {Item | null} item - The item to convert.
	 * @param {string} displayKey - The key to extract the display text.
	 * @returns {string} - The display string for the item.
	 */
	itemToString: (item: Item | null, displayKey: string) => string;

	/**
	 * Function to convert an item to a value string based on the valueKey.
	 * @param {Item | null} item - The item to convert.
	 * @param {string} valueKey - The key to extract the value.
	 * @returns {string} - The value string for the item.
	 */
	itemToValue: (item: Item | null, valueKey: string) => string;

	classNameTitle?: string;
}

/**
 * A React component that renders a set of fields with dynamic item lists and handles user selections.
 * @param {ManageOrMemberComponentProps} props - The props for the component.
 * @returns {React.ReactElement} - The rendered component.
 */
const ManageOrMemberComponentBase = (props: ManageOrMemberComponentProps): React.ReactElement => {
	const {
		fields,
		itemsLists,
		selectedValues,
		onSelectedValuesChange,
		handleChange,
		itemToString,
		itemToValue,
		classNameTitle
	} = props;

	/**
	 * Internal handler for value changes.
	 * Calls the external handleChange function if provided, and updates the selected values.
	 * @param {string} field - The label of the field where the change occurred.
	 * @param {Item | null} selectedItem - The newly selected item or null.
	 */
	const handleInternalChange = (field: string, selectedItem: Item | null) => {
		if (handleChange) {
			handleChange(field, selectedItem);
		}
		onSelectedValuesChange({
			...selectedValues,
			[field]: selectedItem
		});
	};

	return (
		<div>
			{fields.map((field, index) => (
				<div key={index} className="mb-4">
					<label className="block text-gray-600 mb-1 text-sm">
						<span className={clsxm('text-[14px]', classNameTitle)}>{field.label}</span>
						{field.isRequired && <span className="text-[#de5505e1] ml-1 text-sm">*</span>}
					</label>
					<CustomCombobox
						defaultValue={field.defaultValue}
						popoverWidth="w-full"
						buttonWidth="w-full"
						itemToString={(item) => itemToString(item, field.displayKey)}
						itemToValue={(item) => itemToValue(item, field.valueKey)}
						items={itemsLists[field.element] || []}
						onChangeValue={(selectedItem) => handleInternalChange(field.element, selectedItem)}
						placeholder={field.placeholder}
						selectedItem={selectedValues[field.element] || null}
					/>
				</div>
			))}
		</div>
	);
};

export const ManageOrMemberComponent = React.memo(ManageOrMemberComponentBase);

/**
 * Function to get a nested value from an object.
 * @param {Object} obj - The object to retrieve the value from.
 * @param {string} key - The key to the nested value.
 * @returns {*} - The nested value.
 */
export const getNestedValue = (obj: any, key: string) => {
	return key.split('.').reduce((o, i) => o && o[i], obj);
};
