import { GAUZY_API_SERVER_URL } from "@app/constants";

export function serverFetch<T>({
  path,
  method,
  body,
  init,
  bearer_token,
}: {
  path: string;
  method: "POST" | "GET" | "PUT" | "DELETE";
  body?: any;
  bearer_token?: string;
  init?: RequestInit;
}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (bearer_token) {
    headers["authorization"] = `Bearer ${bearer_token}`;
  }

  const datas: { body?: string } = {};
  if (body) {
    datas["body"] = JSON.stringify(body);
  }

  return fetch((GAUZY_API_SERVER_URL || "") + path, {
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
