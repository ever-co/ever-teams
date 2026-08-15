'use client';

import { Suspense } from 'react';
import { AuthPassword } from '../../components/auth/auth-password';

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPassword />
    </Suspense>
  );
}
