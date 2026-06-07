"use client"

import Link from "next/link"
import {
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  ListChecksIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ReportsQuickActions() {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4">
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/admin/reviews?status=pending&sort=oldest">
            <ClockIcon className="mr-1 size-4" />
            Review pending reports
          </Link>
        </Button>
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/admin/reviews?status=under_review">
            <FlagIcon className="mr-1 size-4" />
            See reports under review
          </Link>
        </Button>
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/admin/reviews?status=resolved">
            <CheckCircleIcon className="mr-1 size-4" />
            View recently resolved
          </Link>
        </Button>
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/admin/reviews?status=all&sort=newest">
            <ListChecksIcon className="mr-1 size-4" />
            View all reports
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
