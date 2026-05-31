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
import { customersApi } from "@/lib/api/customers"
import { friendlyError } from "@/lib/axios"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  phone: z.string().max(50).optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function NewCustomerPage({
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
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  })

  const mut = useMutation({
    mutationFn: (data: Values) => customersApi.create(tenantId, data),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["customers", tenantId] })
      toast.success("Customer created")
      router.push(`/${tenantId}/customers/${c.id}`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/${tenantId}/customers`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Customers
          </Link>
        }
        title="New customer"
        description="Capture the people and organizations you want to bill."
      />

      <form
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
      >
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...form.register("address")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Anything else worth remembering about this customer…"
                {...form.register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6 text-sm">
              <p className="font-medium">Before you save</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Customer email must be unique within this tenant.</li>
                <li>• You can assign products and plans after creation.</li>
                <li>• Notes are only visible to your team.</li>
              </ul>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2">
            <Button type="submit" loading={mut.isPending} className="w-full">
              Create customer
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
        </div>
      </form>
    </div>
  )
}
