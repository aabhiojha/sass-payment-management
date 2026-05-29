"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { friendlyError } from "@/lib/axios"

const CURRENCIES = ["USD", "NPR"] as const

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  currency: z.enum(CURRENCIES),
  billingCadence: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]),
})
type Values = z.infer<typeof schema>

export default function NewProductPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const router = useRouter()
  const qc = useQueryClient()

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      currency: "USD",
      billingCadence: "MONTHLY",
    },
  })

  const mut = useMutation({
    mutationFn: (data: Values) => productsApi.create(tenantId, data),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["products", tenantId] })
      toast.success("Product created")
      router.push(`/${tenantId}/products/${p.id}`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/${tenantId}/products`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Products
          </Link>
        }
        title="New product"
        description="Add a subscription product to your catalog."
      />

      <form
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
      >
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Pro Plan" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="What does this product include?"
                {...form.register("description")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min={0.01}
                  {...form.register("price")}
                />
                {form.formState.errors.price && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  defaultValue="USD"
                  onValueChange={(v) => form.setValue("currency", v as typeof CURRENCIES[number])}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="NPR">NPR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Billing cadence</Label>
              <Select
                defaultValue="MONTHLY"
                onValueChange={(v) =>
                  form.setValue("billingCadence", v as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-6 text-sm">
              <p className="font-medium">Pricing tips</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Use the same currency as your finance ledger.</li>
                <li>• Cadence controls how reminders are scheduled.</li>
                <li>• You can deactivate products without deleting them.</li>
              </ul>
            </CardContent>
          </Card>
          <Button type="submit" loading={mut.isPending} className="w-full">
            Create product
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
