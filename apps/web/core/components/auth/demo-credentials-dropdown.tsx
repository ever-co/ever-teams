'use client';

import { IS_DEMO_MODE, DEMO_ACCOUNTS_CONFIG } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import { useState } from 'react';

interface DemoCredentialsDropdownProps {
	onCredentialSelect?: (email: string, password: string) => void;
}

/**
 * DemoCredentialsDropdown Component
 *
 * Displays a shadcn/ui Select dropdown showing demo credentials in text format.
 * Design matches demo.gauzy.co - positioned above the login form.
 *
 * When closed: Shows only the selected role (e.g., "Super Admin")
 * When open: Shows full details (role + email + password)
 * When selected: Auto-fills the form with credentials
 */
export function DemoCredentialsDropdown({ onCredentialSelect }: DemoCredentialsDropdownProps) {
	const [selectedRole, setSelectedRole] = useState<string>('');

	// Only render in demo mode
	if (!IS_DEMO_MODE) {
		return null;
	}

	const handleValueChange = (accountType: string) => {
		const account = DEMO_ACCOUNTS_CONFIG.find((acc) => acc.type === accountType);
		if (account) {
			setSelectedRole(account.role);
			// Auto-fill the form with selected credentials
			if (onCredentialSelect) {
				onCredentialSelect(account.email, account.password);
			}
		}
	};

	return (
		<div className="w-full">
			<Select onValueChange={handleValueChange}>
				<SelectTrigger
					className={cn(
						'w-full px-4 py-3 h-auto',
						'bg-gray-100 hover:bg-gray-200',
						'dark:bg-[#1B1D22] dark:hover:bg-[#25272D]',
						'border border-gray-200 dark:border-gray-700',
						'text-gray-700 dark:text-gray-300 font-medium text-sm',
						'transition-all duration-200'
					)}
				>
					<SelectValue placeholder="Demo Credentials">
						{selectedRole || 'Demo Credentials'}
					</SelectValue>
				</SelectTrigger>
				<SelectContent className="w-full dark:bg-[#1B1D22] border-gray-200 dark:border-gray-700">
					<SelectGroup>
						{DEMO_ACCOUNTS_CONFIG.map((account) => (
							<SelectItem
								key={account.type}
								value={account.type}
								className={cn(
									'cursor-pointer focus:bg-gray-100 dark:focus:bg-[#25272D]',
									'py-3 px-4'
								)}
							>
								<div className="flex flex-col gap-1 text-sm">
									<p className="font-semibold text-gray-900 dark:text-white">
										{account.role}
									</p>
									<p className="text-gray-600 dark:text-gray-400 text-xs">
										Email: <span className="font-mono text-gray-800 dark:text-gray-200">{account.email}</span>
									</p>
									<p className="text-gray-600 dark:text-gray-400 text-xs">
										Password: <span className="font-mono text-gray-800 dark:text-gray-200">{account.password}</span>
									</p>
								</div>
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
