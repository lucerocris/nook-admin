"use client"

import Link from "next/link"
import {
  ChatCircle,
  Flag,
  IdentificationBadge,
  Storefront,
  Users,
  WarningCircle,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Stats = {
  totalCafes: number
  totalUsers: number
  reviewsThisWeek: number
  activeOwners: number
  unclaimedCafes: number
  pendingReports: number
}

export function SectionCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Total Cafes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.totalCafes}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Storefront />
              {stats.totalCafes}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active listings on the platform <Storefront className="size-4" />
          </div>
          <div className="text-muted-foreground">Published and draft cafes</div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Unclaimed Listings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.unclaimedCafes}
          </CardTitle>
          <CardAction>
            <Badge variant="destructive">
              <WarningCircle />{stats.unclaimedCafes}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Cafes without an owner account{" "}
            <WarningCircle className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Needs an owner account created
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Pending Reports</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.pendingReports}
          </CardTitle>
          <CardAction>
            <Badge variant="destructive">
              <Flag />
              {stats.pendingReports}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Reports awaiting moderator action{" "}
            <Flag className="size-4" />
          </div>
          <div className="text-muted-foreground">
            <Link
              href="/admin/reviews?status=pending&sort=oldest"
              className="font-medium text-foreground hover:underline underline-offset-2"
            >
              Open the queue →
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Total App Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.totalUsers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Users />
              {stats.totalUsers.toLocaleString()}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Registered users on the app <Users className="size-4" />
          </div>
          <div className="text-muted-foreground">
            All accounts across the platform
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Active Owners</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.activeOwners}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IdentificationBadge />
              {stats.activeOwners}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Owners with portal access{" "}
            <IdentificationBadge className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Linked to at least one cafe
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Reviews This Week</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.reviewsThisWeek}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <ChatCircle />
              {stats.reviewsThisWeek}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Community engagement signal <ChatCircle className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Reviews posted in the last 7 days
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
