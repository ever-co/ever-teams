/** @jest-environment jsdom */
/**
 * #5024: the icon field of the task property forms loads an uploaded icon from the edited property's `fullIconUrl`
 * only while the form holds that very icon. An upload picked since, not saved yet, must never show the old image.
 */
import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm, type UseFormSetValue } from 'react-hook-form';

const mockPickerProps = jest.fn();
jest.mock('./pages/task-properties/property-icon-picker', () => ({
	PropertyIconPicker: (props: { value: string | null; valueUrl?: string | null }) => {
		mockPickerProps(props);
		return null;
	}
}));

import IconPopover from './icon-popover';

const STORED_ICON = 'image-asset:5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a:S3:uploads/task_property_icons/t/a.png';
const STORED_URL = 'https://bucket.s3.amazonaws.com/uploads/task_property_icons/t/a.png?X-Amz-Signature=abc';
const NEW_UPLOAD = 'image-asset:9c2d4e6f-1a3b-4c5d-8e7f-0a1b2c3d4e5f';

interface IconForm {
	icon: string | null;
}

function renderField(stored?: { icon?: string | null; fullIconUrl?: string | null } | null) {
	const handle: { setValue?: UseFormSetValue<IconForm> } = {};
	function Field({ onForm }: Readonly<{ onForm: (setValue: UseFormSetValue<IconForm>) => void }>) {
		const form = useForm<IconForm>({ defaultValues: { icon: stored?.icon ?? null } });
		useEffect(() => onForm(form.setValue), [form.setValue, onForm]);
		return <IconPopover kind="status" control={form.control} setValue={form.setValue} stored={stored} />;
	}
	render(<Field onForm={(setValue) => (handle.setValue = setValue)} />);
	return { setValue: (icon: string) => act(() => handle.setValue?.('icon', icon)) };
}

const lastPickerProps = () => mockPickerProps.mock.calls.at(-1)?.[0];

describe('IconPopover, the URL of an uploaded icon', () => {
	beforeEach(() => mockPickerProps.mockClear());

	it("loads the stored icon from the property's fullIconUrl while the form holds it", () => {
		renderField({ icon: STORED_ICON, fullIconUrl: STORED_URL });

		expect(lastPickerProps()).toMatchObject({ value: STORED_ICON, valueUrl: STORED_URL });
	});

	it('gives no URL once another upload is picked, so the old image never shows for it', () => {
		const field = renderField({ icon: STORED_ICON, fullIconUrl: STORED_URL });

		field.setValue(NEW_UPLOAD);

		expect(lastPickerProps()).toMatchObject({ value: NEW_UPLOAD, valueUrl: null });
	});

	it('gives no URL to a property being created', () => {
		const field = renderField(null);

		field.setValue(NEW_UPLOAD);

		expect(lastPickerProps()).toMatchObject({ value: NEW_UPLOAD, valueUrl: null });
	});
});
