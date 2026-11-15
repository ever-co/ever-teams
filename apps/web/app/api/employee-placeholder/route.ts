import { proxyCreateEmployeePlaceholder } from '@/core/services/server/employee-placeholder-proxy';

// Proxy mode twin of Gauzy's `POST /employee-placeholder`: a member without an account (ever-gauzy #11913).
export async function POST(req: Request) {
	return proxyCreateEmployeePlaceholder(req);
}
