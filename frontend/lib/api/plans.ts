import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type {
  AssignProductRequest,
  CustomerProductResponse,
  RawPage,
} from "@/types/api"

export const plansApi = {
  listAll: (tenantId: number, page = 0, size = 20, status?: string, search?: string) =>
    api
      .get<RawPage<CustomerProductResponse>>(
        `/tenants/${tenantId}/customer-products`,
        {
          params: {
            page, size,
            ...(status && status !== "ALL" ? { status } : {}),
            ...(search ? { search } : {}),
          },
        }
      )
      .then((r) => normalizePage<CustomerProductResponse>(r.data)),

  listForCustomer: (
    tenantId: number,
    customerId: number,
    page = 0,
    size = 20
  ) =>
    api
      .get<RawPage<CustomerProductResponse>>(
        `/tenants/${tenantId}/customers/${customerId}/products`,
        { params: { page, size } }
      )
      .then((r) => normalizePage<CustomerProductResponse>(r.data)),

  listForProduct: (
    tenantId: number,
    productId: number,
    page = 0,
    size = 50
  ) =>
    api
      .get<RawPage<CustomerProductResponse>>(
        `/tenants/${tenantId}/products/${productId}/customers`,
        { params: { page, size } }
      )
      .then((r) => normalizePage<CustomerProductResponse>(r.data)),

  get: (tenantId: number, customerId: number, cpId: number) =>
    api
      .get<CustomerProductResponse>(
        `/tenants/${tenantId}/customers/${customerId}/products/${cpId}`
      )
      .then((r) => r.data),

  assign: (
    tenantId: number,
    customerId: number,
    data: AssignProductRequest
  ) =>
    api
      .post<CustomerProductResponse>(
        `/tenants/${tenantId}/customers/${customerId}/products`,
        data
      )
      .then((r) => r.data),

  update: (
    tenantId: number,
    customerId: number,
    cpId: number,
    data: Partial<AssignProductRequest>
  ) =>
    api
      .patch<CustomerProductResponse>(
        `/tenants/${tenantId}/customers/${customerId}/products/${cpId}`,
        data
      )
      .then((r) => r.data),

  setStatus: (
    tenantId: number,
    customerId: number,
    cpId: number,
    status: "ACTIVE" | "PAUSED" | "CANCELLED"
  ) =>
    api
      .patch<CustomerProductResponse>(
        `/tenants/${tenantId}/customers/${customerId}/products/${cpId}/status`,
        { status }
      )
      .then((r) => r.data),

  delete: (tenantId: number, customerId: number, cpId: number) =>
    api
      .delete(
        `/tenants/${tenantId}/customers/${customerId}/products/${cpId}`
      )
      .then((r) => r.data),
}
