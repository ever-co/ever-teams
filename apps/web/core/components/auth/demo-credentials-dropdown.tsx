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
	className?: string;
}

/**
 *
 * Displays a Select dropdown showing demo credentials in text format, positioned above the login form.
 *
 * When closed: Shows only the selected role (e.g., "Super Admin")
 * When open: Shows full details (role + email + password)
 * When selected: Auto-fills the form with credentials
 */
export function DemoCredentialsDropdown({ onCredentialSelect, className }: DemoCredentialsDropdownProps) {
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
		<Select onValueChange={handleValueChange}>
			<SelectTrigger className={cn('w-full font-medium', className)}>
				<SelectValue placeholder="Demo Credentials" className="text-xs">
					{selectedRole || 'Demo Credentials'}
				</SelectValue>
			</SelectTrigger>
			<SelectContent className="w-full">
				<SelectGroup>
					{DEMO_ACCOUNTS_CONFIG.map((account) => (
						<SelectItem key={account.type} value={account.type} className="cursor-pointer py-2">
							<div className="flex flex-col gap-1 text-sm">
								<p className="text-xs font-semibold text-foreground">{account.role}</p>
								<p className="text-xs text-muted-foreground">
									Email: <span className="font-mono text-foreground">{account.email}</span>
								</p>
								<p className="text-xs text-muted-foreground">
									Password: <span className="font-mono text-foreground">{account.password}</span>
								</p>
							</div>
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
