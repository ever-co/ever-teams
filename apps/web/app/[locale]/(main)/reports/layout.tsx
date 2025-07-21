import MustBeAManager from '@/core/components/auth/must-be-a-manager';
import React from 'react';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
	return <MustBeAManager useRedirect>{children}</MustBeAManager>;
}
