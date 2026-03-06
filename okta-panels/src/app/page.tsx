import { headers } from 'next/headers';
import { getBrandByDomain } from '@/config/brands.config';
import { OktaPanel } from '@/components/OktaPanel';
import { LoginHandler } from './LoginHandler';

export default async function LoginPage() {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost';
  const brand = getBrandByDomain(hostname);

  return <LoginHandler brand={brand} />;
}
