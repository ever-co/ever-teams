import api from '../axios'

export function getTaskstatusList(tenantId: string, organizationId: string){
    return api.get(`/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}`)
}