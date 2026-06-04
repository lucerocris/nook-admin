"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MagnifyingGlass,
  DotsThree,
  CheckCircle,
  XCircle,
  Clock,
  UserCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveClaimAction,
  markUnderReviewAction,
  rejectClaimAction,
} from "@/app/admin/claims/actions";

export type ClaimStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn";

export type ClaimRow = {
  id: string;
  cafe_id: string;
  claimant_id: string;
  status: ClaimStatus;
  verification_method: string | null;
  verification_code: string | null;
  created_at: string;
  role: string | null;
  cafes: {
    id: string;
    name: string;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    featured_image_url: string | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatMethod(verification_method: string | null) {
  if (verification_method === "instagram_dm") return "Instagram DM";
  if (verification_method === "document") return "Document";
  return verification_method ?? "—";
}

function getInitials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  if (status === "pending") {
    return (
      <Badge
        variant="outline"
        className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
      >
        Pending
      </Badge>
    );
  }
  if (status === "under_review") {
    return (
      <Badge
        variant="outline"
        className="text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
      >
        Under review
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge
        variant="outline"
        className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
      >
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge
        variant="outline"
        className="text-red-700 border-red-300 bg-red-50 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
      >
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Withdrawn
    </Badge>
  );
}

function ClaimActions({ claim }: { claim: ClaimRow }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<
    "approve" | "reject" | null
  >(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  function handleMarkUnderReview() {
    startTransition(async () => {
      try {
        await markUnderReviewAction(claim.id);
        toast.success("Claim marked as under review");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update claim";
        toast.error(message);
      }
    });
  }

  function handleApprove() {
    startTransition(async () => {
      try {
        await approveClaimAction(claim.id);
        toast.success("Claim approved");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to approve claim";
        toast.error(message);
      }
    });
  }

  function handleReject() {
    const reason = rejectionReason.trim();
    if (!reason) return;

    startTransition(async () => {
      try {
        await rejectClaimAction(claim.id, reason);
        toast.success("Claim rejected");
        setDialogOpen(false);
        setDialogType(null);
        setRejectionReason("");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to reject claim";
        toast.error(message);
      }
    });
  }

  const isReject = dialogType === "reject";

  return (
    <AlertDialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setDialogType(null);
          setRejectionReason("");
        }
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <DotsThree weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleMarkUnderReview}
            disabled={isPending || claim.status === "under_review"}
          >
            <Clock />
            Mark as under review
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setDialogType("approve");
              setDialogOpen(true);
            }}
            disabled={isPending}
          >
            <CheckCircle />
            Approve claim
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setDialogType("reject");
              setDialogOpen(true);
            }}
            disabled={isPending}
          >
            <XCircle />
            Reject claim
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push(`/admin/profiles/${claim.claimant_id}`)}
          >
            <UserCircle />
            View claimant profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogType && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isReject ? "Reject claim?" : "Approve claim?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isReject
                ? "Let the claimant know why this request was rejected."
                : "This will grant the claimant access to the cafe."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isReject && (
            <div className="space-y-2">
              <Label htmlFor={`rejection-${claim.id}`}>Rejection reason</Label>
              <Textarea
                id={`rejection-${claim.id}`}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Add the reason for rejecting this claim"
                rows={3}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={isReject ? handleReject : handleApprove}
              variant={isReject ? "destructive" : "default"}
              disabled={isPending || (isReject && !rejectionReason.trim())}
            >
              {isReject ? "Reject" : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}

export function ClaimsListClient({
  claims,
  page,
  total,
  totalPages,
}: {
  claims: ClaimRow[];
  page: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pageSize = 20;

  function pushWithParams(nextParams: URLSearchParams) {
    const query = nextParams.toString();
    router.push(query ? `/admin/claims?${query}` : "/admin/claims");
  }

  function updateFilterParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value && value !== "all") {
      p.set(key, value);
    } else {
      p.delete(key);
    }
    p.set("page", "1");
    pushWithParams(p);
  }

  function handleSearch(value: string) {
    updateFilterParam("search", value);
  }

  function handleStatus(value: string) {
    updateFilterParam("status", value);
  }

  function handlePage(nextPage: number) {
    const p = new URLSearchParams(params.toString());
    if (nextPage <= 1) {
      p.delete("page");
    } else {
      p.set("page", String(nextPage));
    }
    pushWithParams(p);
  }

  const hasResults = claims.length > 0;
  const startItem = hasResults ? (page - 1) * pageSize + 1 : 0;
  const endItem = hasResults ? startItem + claims.length - 1 : 0;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Section 1 — Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Claims</h1>
          <p className="text-muted-foreground text-sm">
            Review and action cafe ownership claims
          </p>
        </div>
      </div>

      {/* Section 2 — Filters and search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search cafes or claimant email..."
            defaultValue={params.get("search") ?? ""}
            onChange={(event) => handleSearch(event.target.value)}
          />
        </div>

        <Select
          defaultValue={params.get("status") ?? ""}
          onValueChange={handleStatus}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Pending + under review" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section 3 — Claims table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cafe</TableHead>
            <TableHead>Claimant</TableHead>
            <TableHead>Verification code</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => {
            const cafe = claim.cafes;
            const claimant = claim.profiles;
            const location = [cafe?.address, cafe?.neighborhood, cafe?.city]
              .filter(Boolean)
              .join(", ");
            return (
              <TableRow key={claim.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {cafe?.featured_image_url ? (
                      <div
                        className="size-10 rounded-md bg-muted shrink-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${cafe.featured_image_url})`,
                        }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div
                        className="size-10 rounded-md bg-muted shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/cafes/${claim.cafe_id}`}
                        className="font-medium text-sm hover:underline underline-offset-2"
                      >
                        {cafe?.name ?? "Unknown cafe"}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {location || "Location not provided"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src={claimant?.avatar_url ?? ""} />
                      <AvatarFallback>
                        {getInitials(
                          claimant?.full_name ?? null,
                          claimant?.email ?? null,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {claimant?.full_name ?? "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {claimant?.email ?? "No email"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs ${
                      claim.verification_code ? "" : "text-muted-foreground"
                    }`}
                  >
                    {claim.verification_code ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>{formatMethod(claim.verification_method)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(claim.created_at)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={claim.status} />
                </TableCell>
                <TableCell className="text-right">
                  <ClaimActions claim={claim} />
                </TableCell>
              </TableRow>
            );
          })}
          {!hasResults && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground py-8"
              >
                No claims found for the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(page + 1)}
            disabled={totalPages === 0 || page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
