import api from '../axios'

export function getTaskSizesList(tenantId: string, organizationId: string){
    return api.get(`/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}`)
}