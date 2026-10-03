"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock,
  DotsThree,
  SealCheck,
  UserCircle,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FilterChips,
  PageHeader,
  SearchField,
  StatusChip,
  StatusTabs,
  TableCard,
  TableEmpty,
  TableFooter,
  TD,
  TH,
  Thumb,
  Toolbar,
  TR,
  shortAge,
  useDebouncedSearch,
  useUrlState,
  type ActiveFilter,
  type Tone,
} from "@/components/admin/table-kit";
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

export type ClaimStatusCounts = Record<ClaimStatus, number>;

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

const STATUS: Record<ClaimStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  under_review: { label: "Under review", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

// "open" is the page's default view (pending + under review) and is never
// written to the URL; the server applies it when `status` is absent. "all" is
// written as status=all, which the server treats as no status filter.
const OPEN_TAB = "open";
const FILTER_KEYS = ["search"];

function isOpen(status: ClaimStatus) {
  return status === "pending" || status === "under_review";
}

function formatMethod(verification_method: string | null) {
  if (verification_method === "instagram_dm") return "Instagram DM";
  if (verification_method === "document") return "Document";
  return verification_method ?? "—";
}

function formatRole(role: string | null) {
  if (!role) return null;
  const words = role.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "2 days", "5 hours", "a few minutes" — for the header summary. */
function ageInWords(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function claimantLabel(claim: ClaimRow) {
  return claim.profiles?.full_name ?? claim.profiles?.email ?? "Unknown claimant";
}

/** "Name · Role", with the email on hover so a claim can be matched to a
 *  search by email without widening the row. */
function ClaimantLine({ claim }: { claim: ClaimRow }) {
  const role = formatRole(claim.role);
  return (
    <span
      className="truncate text-xs text-muted-foreground"
      title={claim.profiles?.email ?? undefined}
    >
      {claimantLabel(claim)}
      {role && ` · ${role}`}
    </span>
  );
}

function VerificationCode({ code }: { code: string | null }) {
  return code ? (
    <span className="font-mono text-[13px] tracking-wide">{code}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

/** The row's decisions: Approve / Reject… inline on open claims (desktop),
 *  everything else in the menu. Approve confirms; Reject asks for a reason
 *  that's sent to the claimant. */
function ClaimActions({
  claim,
  inline = false,
}: {
  claim: ClaimRow;
  inline?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<
    "approve" | "reject" | null
  >(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const cafeName = claim.cafes?.name ?? "this café";

  function openDialog(type: "approve" | "reject") {
    setDialogType(type);
    setDialogOpen(true);
  }

  function handleMarkUnderReview() {
    startTransition(async () => {
      const result = await markUnderReviewAction(claim.id);
      if (result.success) {
        toast.success("Claim marked as under review");
      } else {
        toast.error(result.error ?? "Couldn’t update the claim");
      }
    });
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await approveClaimAction(claim.id);
      if (result.success) {
        toast.success(`Claim for ${cafeName} approved`);
        setDialogOpen(false);
        setDialogType(null);
      } else {
        toast.error(result.error ?? "Couldn’t approve the claim");
      }
    });
  }

  function handleReject() {
    const reason = rejectionReason.trim();
    if (!reason) return;

    startTransition(async () => {
      const result = await rejectClaimAction(claim.id, reason);
      if (result.success) {
        toast.success(`Claim for ${cafeName} rejected`);
        setDialogOpen(false);
        setDialogType(null);
        setRejectionReason("");
      } else {
        toast.error(result.error ?? "Couldn’t reject the claim");
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
      <div className="flex items-center justify-end gap-1.5">
        {inline && isOpen(claim.status) && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => openDialog("approve")}
            >
              <CheckCircle aria-hidden />
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => openDialog("reject")}
            >
              Reject…
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              aria-label={`Actions for the claim on ${cafeName}`}
            >
              <DotsThree weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={handleMarkUnderReview}
              disabled={
                isPending || !isOpen(claim.status) || claim.status === "under_review"
              }
            >
              <Clock />
              Mark as under review
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                openDialog("approve");
              }}
              disabled={isPending || !isOpen(claim.status)}
            >
              <CheckCircle />
              Approve claim
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                openDialog("reject");
              }}
              disabled={isPending || !isOpen(claim.status)}
            >
              <XCircle />
              Reject claim…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                router.push(`/admin/profiles/${claim.claimant_id}`)
              }
            >
              <UserCircle />
              View claimant profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {dialogType && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isReject
                ? `Reject the claim on ${cafeName}?`
                : `Approve the claim on ${cafeName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isReject
                ? "Let the claimant know why this request was rejected. They’ll get your reason by email."
                : `${claimantLabel(claim)} gets owner access to ${cafeName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {claim.verification_code && (
            <p className="text-sm">
              <span className="text-muted-foreground">Verification code </span>
              <span className="font-mono">{claim.verification_code}</span>
              <span className="text-muted-foreground">
                {" "}
                · {formatMethod(claim.verification_method)}
              </span>
            </p>
          )}
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
              onClick={(event) => {
                // Keep the dialog open until the action settles so a failure
                // can be read and retried; the handlers close it on success.
                event.preventDefault();
                if (isReject) handleReject();
                else handleApprove();
              }}
              variant={isReject ? "destructive" : "default"}
              disabled={isPending || (isReject && !rejectionReason.trim())}
            >
              {isReject ? "Reject claim" : "Approve claim"}
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
  pageSize,
  total,
  totalPages,
  statusCounts,
  oldestOpenAt,
}: {
  claims: ClaimRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  statusCounts: ClaimStatusCounts;
  oldestOpenAt: string | null;
}) {
  const url = useUrlState();
  const search = useDebouncedSearch();

  const rawStatus = url.get("status");
  const tab = !rawStatus
    ? OPEN_TAB
    : Object.hasOwn(STATUS, rawStatus)
      ? rawStatus
      : "all";

  const openCount = statusCounts.pending + statusCounts.under_review;
  const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const summary =
    openCount === 0
      ? "Nothing waiting"
      : [
          `${statusCounts.pending.toLocaleString()} pending`,
          statusCounts.under_review > 0 &&
            `${statusCounts.under_review.toLocaleString()} under review`,
          oldestOpenAt && `oldest ${ageInWords(oldestOpenAt)}`,
        ]
          .filter(Boolean)
          .join(" · ");

  const filters: ActiveFilter[] = [];
  if (url.get("search"))
    filters.push({
      key: "search",
      label: "Search",
      value: `“${url.get("search")}”`,
      onRemove: () => url.set("search", ""),
    });

  const tabLabel =
    tab === OPEN_TAB || tab === "all"
      ? null
      : STATUS[tab as ClaimStatus].label.toLowerCase();

  const empty =
    claims.length === 0 ? (
      filters.length > 0 ? (
        <TableEmpty
          icon={SealCheck}
          title="No claims match"
          body="Try a café name or the claimant’s email."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => url.clear(FILTER_KEYS)}
            >
              Clear filters
            </Button>
          }
        />
      ) : tab === OPEN_TAB ? (
        <TableEmpty
          icon={SealCheck}
          title="Nothing waiting"
          body="New ownership claims show up here until you approve or reject them."
        />
      ) : (
        <TableEmpty
          icon={SealCheck}
          title={tabLabel ? `No ${tabLabel} claims` : "No claims yet"}
          body="Claims move here as they’re decided."
        />
      )
    ) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Claims" summary={summary} />

      <StatusTabs
        value={tab}
        onChange={(v) => url.set("status", v, OPEN_TAB)}
        tabs={[
          { value: OPEN_TAB, label: "Open", count: openCount },
          { value: "pending", label: "Pending", count: statusCounts.pending },
          {
            value: "under_review",
            label: "Under review",
            count: statusCounts.under_review,
          },
          { value: "approved", label: "Approved", count: statusCounts.approved },
          { value: "rejected", label: "Rejected", count: statusCounts.rejected },
          {
            value: "withdrawn",
            label: "Withdrawn",
            count: statusCounts.withdrawn,
          },
          { value: "all", label: "All", count: allCount },
        ]}
      />

      <Toolbar>
        <SearchField
          value={search.value}
          onChange={search.onChange}
          placeholder="Search by café or claimant email"
        />
      </Toolbar>

      <FilterChips filters={filters} onClearAll={() => url.clear(FILTER_KEYS)} />

      <TableCard
        busy={url.isPending}
        empty={empty}
        table={
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className={TH}>Café and claimant</TableHead>
                <TableHead className={TH}>Code</TableHead>
                <TableHead className={TH}>Method</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={TH}>Age</TableHead>
                <TableHead className={`${TH} text-right`}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id} className={TR}>
                  <TableCell className={`${TD} max-w-[22rem]`}>
                    <div className="flex items-center gap-3">
                      <Thumb src={claim.cafes?.featured_image_url} />
                      <div className="grid min-w-0 leading-tight">
                        <Link
                          href={`/admin/cafes/${claim.cafe_id}`}
                          className="truncate font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {claim.cafes?.name ?? "Unknown café"}
                        </Link>
                        <ClaimantLine claim={claim} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={TD}>
                    <VerificationCode code={claim.verification_code} />
                  </TableCell>
                  <TableCell className={TD}>
                    {formatMethod(claim.verification_method)}
                  </TableCell>
                  <TableCell className={TD}>
                    <StatusChip tone={STATUS[claim.status].tone}>
                      {STATUS[claim.status].label}
                    </StatusChip>
                  </TableCell>
                  <TableCell
                    className={`${TD} text-muted-foreground tabular-nums`}
                  >
                    <time
                      dateTime={claim.created_at}
                      title={new Date(claim.created_at).toLocaleString()}
                    >
                      {shortAge(claim.created_at)}
                    </time>
                  </TableCell>
                  <TableCell className={TD}>
                    <ClaimActions claim={claim} inline />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        list={claims.map((claim) => (
          <li key={claim.id} className="flex items-start gap-3 px-4 py-3">
            <Thumb src={claim.cafes?.featured_image_url} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/admin/cafes/${claim.cafe_id}`}
                  className="truncate text-sm font-medium"
                >
                  {claim.cafes?.name ?? "Unknown café"}
                </Link>
                <StatusChip
                  tone={STATUS[claim.status].tone}
                  className="shrink-0"
                >
                  {STATUS[claim.status].label}
                </StatusChip>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {claimantLabel(claim)}
                {formatRole(claim.role) && ` · ${formatRole(claim.role)}`}
                {claim.verification_code && (
                  <>
                    {" · "}
                    <span className="font-mono text-foreground">
                      {claim.verification_code}
                    </span>
                  </>
                )}
                {` · ${shortAge(claim.created_at)}`}
              </p>
            </div>
            <ClaimActions claim={claim} />
          </li>
        ))}
        footer={
          <TableFooter
            page={page}
            pageSize={pageSize}
            shown={claims.length}
            total={total}
            totalPages={totalPages}
            onPage={(p) => url.set("page", p > 1 ? String(p) : "")}
            noun="claims"
          />
        }
      />
    </div>
  );
}
