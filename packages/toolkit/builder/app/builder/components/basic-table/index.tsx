import { Input as Inputs } from '@builder.io/sdk';
import { TeamsTable, TeamsTableProps } from '@ever-teams/atoms';

export function BasicTable({ ...props }: TeamsTableProps) {
	return <TeamsTable {...props} />;
}

export const InputBasicTable: Inputs[] = [
	{
		name: 'data',
		type: 'list',
		defaultValue: [
			{ invoice: 'INV001', paymentStatus: 'Paid', totalAmount: '$250.00', paymentMethod: 'Credit Card' },
			{ invoice: 'INV002', paymentStatus: 'Pending', totalAmount: '$150.00', paymentMethod: 'PayPal' }
		]
	},
	{ name: 'caption', type: 'text', defaultValue: 'A list of your recent invoices.' },
	{
		name: 'footerData',
		type: 'object',
		subFields: [
			{ name: 'label', type: 'text', defaultValue: 'Total' },
			{ name: 'value', type: 'text', defaultValue: '$2,500.00' }
		]
	},
	{ name: 'tableClassName', type: 'string', defaultValue: '' },
	{ name: 'headerClassName', type: 'string', defaultValue: '' },
	{ name: 'rowClassName', type: 'string', defaultValue: '' },
	{ name: 'cellClassName', type: 'string', defaultValue: '' },
	{ name: 'footerClassName', type: 'string', defaultValue: '' }
];
