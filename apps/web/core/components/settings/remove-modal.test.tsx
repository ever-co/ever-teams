/** @jest-environment jsdom */

/**
 * The confirm modal of the Danger Zones: a failed action says so and keeps the modal open, an action with nothing to
 * act on (it throws) does too, and the answer of an attempt the person discarded never shows on the next opening.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type TButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components', () => {
	const Text = ({ children }: { children?: ReactNode }) => <span>{children}</span>;
	Text.Heading = Text;
	Text.Error = ({ children }: { children?: ReactNode }) => <p role="alert">{children}</p>;
	const Button = ({ children, disabled, onClick }: TButtonProps) => (
		<button disabled={disabled} onClick={onClick}>
			{children}
		</button>
	);
	const Modal = ({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) =>
		isOpen ? <div>{children}</div> : null;
	return { Button, Modal, Text };
});

import { RemoveModal } from './remove-modal';

function Harness({ open, onAction, close }: { open: boolean; onAction: () => unknown; close: () => void }) {
	return <RemoveModal open={open} close={close} title="Delete?" onAction={onAction} loading={false} />;
}

describe('RemoveModal', () => {
	it('stays open and says the action failed when it has nothing to act on (it throws)', async () => {
		const close = jest.fn();
		render(
			<Harness
				open
				close={close}
				onAction={() => {
					throw new Error('');
				}}
			/>
		);

		await act(async () => {
			fireEvent.click(screen.getByText('common.CONFIRM'));
		});

		expect(screen.getByRole('alert').textContent).toBe('alerts.ACTION_FAILED');
		expect(close).not.toHaveBeenCalled();
	});

	it('drops the answer of an attempt discarded while it was pending', async () => {
		let reject: (error: Error) => void = () => undefined;
		const pending = new Promise((_resolve, rejectPromise) => {
			reject = rejectPromise;
		});
		const close = jest.fn();
		const { rerender } = render(<Harness open close={close} onAction={() => pending} />);

		await act(async () => {
			fireEvent.click(screen.getByText('common.CONFIRM'));
		});
		fireEvent.click(screen.getByText('common.DISCARD'));
		expect(close).toHaveBeenCalledTimes(1);
		rerender(<Harness open={false} close={close} onAction={() => pending} />);

		await act(async () => {
			reject(new Error('Gauzy said no'));
			await pending.catch(() => undefined);
		});
		rerender(<Harness open close={close} onAction={() => pending} />);

		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('closes after a successful action', async () => {
		const close = jest.fn();
		render(<Harness open close={close} onAction={async () => ({ data: {} })} />);

		await act(async () => {
			fireEvent.click(screen.getByText('common.CONFIRM'));
		});

		expect(close).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('alert')).toBeNull();
	});
});
