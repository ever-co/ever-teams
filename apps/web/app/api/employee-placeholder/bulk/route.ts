import { proxyCreateEmployeePlaceholders } from '@/core/services/server/employee-placeholder-proxy';

// Proxy mode twin of Gauzy's `POST /employee-placeholder/bulk`: members without an account, for an import.
export async function POST(req: Request) {
	return proxyCreateEmployeePlaceholders(req);
}
