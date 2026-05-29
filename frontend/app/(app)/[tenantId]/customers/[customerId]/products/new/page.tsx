"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { productsApi } from "@/lib/api/products"
import { plansApi } from "@/lib/api/plans"
import { productPlansApi } from "@/lib/api/product-plans"
import { customersApi } from "@/lib/api/customers"
import { friendlyError } from "@/lib/axios"
import { formatCurrency } from "@/lib/utils"

const schema = z.object({
  productId: z.coerce.number().int().positive(),
  planId: z.coerce.number().int().positive().optional().nullable(),
  customPrice: z.coerce.number().min(0).optional().nullable(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function AssignProductPage({
  params,
}: {
  params: { tenantId: string; customerId: string }
}) {
  const tenantId = Number(params.tenantId)
  const customerId = Number(params.customerId)
  const router = useRouter()
  const qc = useQueryClient()

  const customer = useQuery({
    queryKey: ["customers", tenantId, customerId],
    queryFn: () => customersApi.get(tenantId, customerId),
  })
  const products = useQuery({
    queryKey: ["products", tenantId, 0, 100],
    queryFn: () => productsApi.list(tenantId, 0, 100),
  })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: undefined,
      planId: null,
      customPrice: null,
      startsAt: "",
      endsAt: "",
      notes: "",
    },
  })

  const selectedProductId = form.watch("productId")
  const selectedPlanId = form.watch("planId")

  const productPlans = useQuery({
    queryKey: ["product-plans", tenantId, selectedProductId],
    queryFn: () =>
      productPlansApi.list(tenantId, selectedProductId!),
    enabled: !!selectedProductId,
  })

  const active = products.data?.content?.filter((p) => p.status === "ACTIVE") ?? []
  const selectedProduct = active.find((p) => p.id === selectedProductId)
  const plans = productPlans.data ?? []
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  // Resolved price for display in the summary card
  const customPriceVal = form.watch("customPrice")
  const resolvedPrice =
    customPriceVal != null && customPriceVal > 0
      ? customPriceVal
      : selectedPlan
      ? selectedPlan.price
      : selectedProduct?.price ?? null
  const resolvedCurrency =
    selectedPlan?.currency ?? selectedProduct?.currency ?? "USD"

  const mut = useMutation({
    mutationFn: (data: Values) =>
      plansApi.assign(tenantId, customerId, {
        productId: data.productId,
        planId: data.planId ?? null,
        customPrice: data.customPrice ?? null,
        startsAt: data.startsAt
          ? new Date(data.startsAt).toISOString()
          : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
        notes: data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["customers", tenantId, customerId, "products"],
      })
      qc.invalidateQueries({ queryKey: ["plans", tenantId] })
      toast.success("Plan assigned")
      router.push(`/${tenantId}/customers/${customerId}`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/${tenantId}/customers/${customerId}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />{" "}
            {customer.data?.name ?? "Customer"}
          </Link>
        }
        title="Assign a product"
        description="Activate a subscription plan for this customer."
      />

      <form
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
      >
        <Card>
          <CardContent className="space-y-5 p-6">
            {/* Product selector */}
            <div className="space-y-2">
              <Label htmlFor="productId">Product</Label>
              <Select
                onValueChange={(v) => {
                  form.setValue("productId", Number(v))
                  form.setValue("planId", null)
                  form.setValue("customPrice", null)
                }}
              >
                <SelectTrigger id="productId">
                  <SelectValue placeholder="Choose a product…" />
                </SelectTrigger>
                <SelectContent>
                  {active.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ·{" "}
                      {formatCurrency(p.price, p.currency)} ·{" "}
                      {p.billingCadence.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.productId && (
                <p className="text-xs text-destructive">
                  Please select a product.
                </p>
              )}
            </div>

            {/* Plan tier selector — only shown if the product has pricing tiers */}
            {selectedProductId && plans.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="planId">Pricing tier</Label>
                <Select
                  value={selectedPlanId ? String(selectedPlanId) : "default"}
                  onValueChange={(v) =>
                    form.setValue("planId", v === "default" ? null : Number(v))
                  }
                >
                  <SelectTrigger id="planId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Default — {formatCurrency(selectedProduct?.price ?? 0, selectedProduct?.currency ?? "USD")}
                    </SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>
                        {plan.name} — {formatCurrency(plan.price, plan.currency)} / {plan.billingCadence.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pick a tier or leave on default to use the product&apos;s base price.
                </p>
              </div>
            )}

            {/* Custom price override */}
            {selectedProductId && (
              <div className="space-y-2">
                <Label htmlFor="customPrice">Custom price override</Label>
                <Input
                  id="customPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={
                    selectedPlan
                      ? `Plan price: ${selectedPlan.price}`
                      : selectedProduct
                      ? `Default: ${selectedProduct.price}`
                      : "e.g. 99.00"
                  }
                  {...form.register("customPrice", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Overrides any tier price. Leave blank to use the selected tier or default.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts at</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  {...form.register("startsAt")}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to now if omitted.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends at</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  {...form.register("endsAt")}
                />
                <p className="text-xs text-muted-foreground">
                  Optional — leave blank for open-ended.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Internal notes about this assignment…"
                {...form.register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-6 text-sm">
              <p className="font-medium">Summary</p>
              {selectedProduct ? (
                <div className="space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Product</span>
                    <span className="text-foreground font-medium">{selectedProduct.name}</span>
                  </div>
                  {selectedPlan && (
                    <div className="flex justify-between">
                      <span>Tier</span>
                      <span className="text-foreground">{selectedPlan.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                    <span>Billed</span>
                    <span className="text-foreground font-semibold">
                      {resolvedPrice != null
                        ? formatCurrency(resolvedPrice, resolvedCurrency)
                        : "—"}
                      {" / "}
                      {(selectedPlan?.billingCadence ?? selectedProduct.billingCadence).toLowerCase()}
                    </span>
                  </div>
                  {customPriceVal != null && customPriceVal > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Custom price active
                    </p>
                  )}
                </div>
              ) : (
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Each customer can hold one ACTIVE assignment per product.</li>
                  <li>• You can pause or cancel later from the customer view.</li>
                </ul>
              )}
            </CardContent>
          </Card>
          <Button type="submit" loading={mut.isPending} className="w-full">
            Assign product
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
