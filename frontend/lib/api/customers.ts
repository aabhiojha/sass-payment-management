import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type {
  CreateCustomerRequest,
  CustomerResponse,
  RawPage,
} from "@/types/api"

export const customersApi = {
  list: (tenantId: number, page = 0, size = 20, status?: string) =>
    api
      .get<RawPage<CustomerResponse>>(`/tenants/${tenantId}/customers`, {
        params: { page, size, ...(status ? { status } : {}) },
      })
      .then((r) => normalizePage<CustomerResponse>(r.data)),

  get: (tenantId: number, customerId: number) =>
    api
      .get<CustomerResponse>(`/tenants/${tenantId}/customers/${customerId}`)
      .then((r) => r.data),

  create: (tenantId: number, data: CreateCustomerRequest) =>
    api
      .post<CustomerResponse>(`/tenants/${tenantId}/customers`, data)
      .then((r) => r.data),

  update: (
    tenantId: number,
    customerId: number,
    data: Partial<CreateCustomerRequest>
  ) =>
    api
      .patch<CustomerResponse>(
        `/tenants/${tenantId}/customers/${customerId}`,
        data
      )
      .then((r) => r.data),

  delete: (tenantId: number, customerId: number) =>
    api
      .delete(`/tenants/${tenantId}/customers/${customerId}`)
      .then((r) => r.data),
}
