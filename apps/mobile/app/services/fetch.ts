import Config from "../config";
import { getToken } from "./api/tokenHandler";


export function serverFetch<T>({
  path,
  method,
  body,
  init,
  bearer_token,
  tenantId,
}: {
  path: string;
  method: "POST" | "GET" | "PUT" | "DELETE";
  body?: any;
  bearer_token?: string;
  init?: RequestInit;
  tenantId?: string;
}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (bearer_token) {
    headers["authorization"] = `Bearer ${bearer_token}`;
  }

  if (tenantId) {
    headers["tenant-id"] = tenantId;
  }

  const datas: { body?: string } = {};
  if (body) {
    datas["body"] = JSON.stringify(body);
  }

  return fetch((Config.API_URL || "") + path, {
    ...datas,
    ...(init || {}),
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
    method,
  }).then(async (res) => {
    return {
      data: (await res.json().catch(console.error)) as T,
      response: res,
    };
  });
}
