import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type {
  CreateProductRequest,
  ProductResponse,
  RawPage,
} from "@/types/api"

export const productsApi = {
  list: (tenantId: number, page = 0, size = 20, status?: string) =>
    api
      .get<RawPage<ProductResponse>>(`/tenants/${tenantId}/products`, {
        params: { page, size, ...(status ? { status } : {}) },
      })
      .then((r) => normalizePage<ProductResponse>(r.data)),

  get: (tenantId: number, productId: number) =>
    api
      .get<ProductResponse>(`/tenants/${tenantId}/products/${productId}`)
      .then((r) => r.data),

  create: (tenantId: number, data: CreateProductRequest) =>
    api
      .post<ProductResponse>(`/tenants/${tenantId}/products`, data)
      .then((r) => r.data),

  update: (
    tenantId: number,
    productId: number,
    data: Partial<CreateProductRequest> & {
      status?: "ACTIVE" | "INACTIVE" | "DELETED"
    }
  ) =>
    api
      .patch<ProductResponse>(
        `/tenants/${tenantId}/products/${productId}`,
        data
      )
      .then((r) => r.data),

  delete: (tenantId: number, productId: number) =>
    api
      .delete(`/tenants/${tenantId}/products/${productId}`)
      .then((r) => r.data),
}
