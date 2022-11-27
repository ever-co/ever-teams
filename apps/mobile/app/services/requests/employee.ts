import { ICreateEmployee, IEmployee } from "../interfaces/IEmployee";
import { serverFetch } from "../fetch";

export function createEmployeeFromUser(
  data: ICreateEmployee,
  bearer_token: string
) {
  return serverFetch<IEmployee>({
    path: "/employee",
    method: "POST",
    bearer_token,
    body: data,
    tenantId: data.tenantId,
  });
}
