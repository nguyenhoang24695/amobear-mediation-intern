import { useApi } from "./use-api"
import { permissionApi, type PermissionRoleDto } from "@/lib/api/services"

export function useRoles() {
    return useApi<PermissionRoleDto[]>(
        () => permissionApi.getRoles(),
        {
            cacheKey: 'system-permission-roles',
        }
    )
}
