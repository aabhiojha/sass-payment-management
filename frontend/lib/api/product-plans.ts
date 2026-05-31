import { api } from "@/lib/axios"
import type { CreateProductPlanRequest, ProductPlanResponse } from "@/types/api"

export const productPlansApi = {
  list: (tenantId: number, productId: number) =>
    api
      .get<ProductPlanResponse[]>(
        `/tenants/${tenantId}/products/${productId}/plans`
      )
      .then((r) => r.data),

  create: (tenantId: number, productId: number, data: CreateProductPlanRequest) =>
    api
      .post<ProductPlanResponse>(
        `/tenants/${tenantId}/products/${productId}/plans`,
        data
      )
      .then((r) => r.data),

  update: (tenantId: number, productId: number, planId: number, data: Partial<CreateProductPlanRequest>) =>
    api
      .patch<ProductPlanResponse>(
        `/tenants/${tenantId}/products/${productId}/plans/${planId}`,
        data
      )
      .then((r) => r.data),

  delete: (tenantId: number, productId: number, planId: number) =>
    api
      .delete(`/tenants/${tenantId}/products/${productId}/plans/${planId}`)
      .then((r) => r.data),
}
