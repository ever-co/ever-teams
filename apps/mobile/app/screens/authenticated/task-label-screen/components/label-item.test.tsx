/**
 * A row of Settings > Team > Task Labels. A label is shown with the name it was saved with: the form keeps hyphens and
 * capitals, and two labels that differ only by them must stay apart.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import LabelItem from './label-item';
import { ITaskLabelItem } from '../../../../services/interfaces/ITaskLabel';

jest.mock('../../../../../src/components/icons', () =>
	jest.requireActual('../../../../../test/icons-stand-in').iconsStandIn()
);

function labelNamed(name: string): ITaskLabelItem {
	return {
		id: `label-${name}`,
		createdAt: '',
		updatedAt: '',
		tenantId: 'tenant-1',
		organizationId: 'organization-1',
		name,
		color: '#F5B8B8'
	};
}

describe('<LabelItem>', () => {
	it('keeps the name a label was saved with', async () => {
		await render(<LabelItem label={labelNamed('API-v2')} onDeleteLabel={jest.fn()} openForEdit={jest.fn()} />);

		expect(screen.getByText('API-v2')).toBeTruthy();
	});

	it('keeps bug-fix apart from bug fix', async () => {
		await render(<LabelItem label={labelNamed('bug-fix')} onDeleteLabel={jest.fn()} openForEdit={jest.fn()} />);

		expect(screen.getByText('bug-fix')).toBeTruthy();
		expect(screen.queryByText('Bug Fix')).toBeNull();
		expect(StyleSheet.flatten(screen.getByText('bug-fix').props.style).textTransform).toBe('none');
	});
});
