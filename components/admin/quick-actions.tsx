"use client"

import Link from "next/link"
import {
  Flag,
  Storefront,
  WarningCircle,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4">
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/admin/reviews?status=pending&sort=oldest">
            <Flag className="mr-1 size-4" />
            Review pending reports
          </Link>
        </Button>
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/admin/cafes/new">
            <Storefront className="mr-1 size-4" />
            Add New Cafe
          </Link>
        </Button>
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/admin/cafes?filter=unclaimed">
            <WarningCircle className="mr-1 size-4" />
            View Unclaimed Listings
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
