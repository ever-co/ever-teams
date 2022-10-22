import { IncomingHttpHeaders, IncomingMessage } from "http";
import { NextRequest } from "next/server";

const BASE_SERVER_URL = "";

export function serverFetch(
  path: string = "",
  nextRequest: NextRequest | IncomingMessage,
  init?: RequestInit
) {
  let headers: IncomingHttpHeaders | Headers | {} = {};

  if (nextRequest instanceof NextRequest) {
    const request = nextRequest.clone();

    headers = request.headers;
    (headers as Headers).set("Content-Type", "application/json");
    (headers as Headers).set("Accept", "application/json");
  } else {
    headers = nextRequest.headers;
    (headers as IncomingHttpHeaders)["Content-Type"] = "application/json";
    (headers as IncomingHttpHeaders)["Accept"] = "application/json";
  }

  return fetch(BASE_SERVER_URL + path, {
    headers,
    ...(init || {}),
  });
}
