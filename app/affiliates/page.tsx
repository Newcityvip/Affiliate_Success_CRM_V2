"use client";
import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  api,
  AffiliateActivity,
  AffiliateDetailResponse,
  AffiliateDirectoryItem,
  AffiliateDirectoryResponse,
  ApiError,
  FirstContactResult,
  ProspectAttemptResult,
  WorkWorkspace,
} from "../../lib/api-client";
import { EMAIL_TOOL_URL } from "../../lib/external-tools";
import styles from "./workspace.module.css";
import filterStyles from "./filters.module.css";
import { AffiliateFilter as DirectoryFilter } from "../../lib/affiliate-filter";
import {
  clearReadCache,
  invalidateReadCache,
  readCache,
  writeCache,
} from "../../lib/read-cache";
import { Pagination } from "../../components/pagination";

export default function AffiliatesPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceState
          title="Loading Affiliates…"
          detail="Preparing your affiliate workspace."
        />
      }
    >
      <AffiliateRouter />
    </Suspense>
  );
}
function AffiliateRouter() {
  const params = useSearchParams(),
    workId = params.get("workId") || "",
    affiliateId = params.get("affiliateId") || "";
  if (workId) return <WorkWorkspaceView key={workId} workId={workId} />;
  if (affiliateId)
    return <AffiliateProfile key={affiliateId} affiliateId={affiliateId} />;
  return <AffiliateDirectory />;
}
function WorkWorkspaceView({ workId }: { workId: string }) {
  const [workspace, setWorkspace] = useState<WorkWorkspace | null>(null),
    [detail, setDetail] = useState<AffiliateDetailResponse | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState<FirstContactResult | null>(null),
    [badResult, setBadResult] = useState<ProspectAttemptResult | null>(null),
    [showBadAffiliate, setShowBadAffiliate] = useState(false),
    [badAffiliateNotes, setBadAffiliateNotes] = useState(""),
    [outcome, setOutcome] = useState("CONNECTED"),
    [telegramStatus, setTelegramStatus] = useState("TELEGRAM_NOT_CONNECTED");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await api.getWorkWorkspaceBootstrap(workId);
      setWorkspace(current.workspace);
      setDetail(current.detail);
      writeCache(
        `affiliate:${current.workspace.work.affiliateId}`,
        current.detail,
      );
    } catch (cause) {
      setWorkspace(null);
      setDetail(null);
      setError(message_(cause));
    } finally {
      setLoading(false);
    }
  }, [workId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || success || !workspace) return;
    const data = new FormData(event.currentTarget),
      callbackLocal = String(data.get("callbackAt") || ""),
      payload = {
        workId,
        outcome,
        telegramStatus: outcome === "CONNECTED" ? telegramStatus : "",
        telegramUsername: String(data.get("telegramUsername") || ""),
        callbackAt: callbackLocal ? new Date(callbackLocal).toISOString() : "",
        notes: String(data.get("notes") || ""),
      };
    setBusy(true);
    setError("");
    try {
      setSuccess(
        await (workspace.work.workType === "CALLBACK"
          ? api.submitCallbackOutcome(payload)
          : api.submitFirstContactOutcome(payload)),
      );
      invalidateReadCache(
        "my-work",
        "affiliates",
        "followups",
        "interactions",
        "super-admin-dashboard",
        "intelligence",
        `affiliate:${workspace.work.affiliateId}`,
      );
      setWorkspace(null);
    } catch (cause) {
      setError(message_(cause));
    } finally {
      setBusy(false);
    }
  }
  async function markBadAffiliate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !workspace || !badAffiliateNotes.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.markBadAffiliateFromWork({
        workId,
        affiliateId: workspace.work.affiliateId,
        notes: badAffiliateNotes,
        staffId: "IGNORED",
        assignmentId: "IGNORED",
      });
      setBadResult(result);
      setWorkspace(null);
    } catch (cause) {
      setError(message_(cause));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <WorkspaceState
        title="Loading workspace…"
        detail="Retrieving the current affiliate and assignment."
      />
    );
  if (error && !workspace)
    return (
      <WorkspaceState
        title="Workspace unavailable"
        detail={error}
        action={
          <>
            <button className="primary" onClick={() => void load()}>
              Retry
            </button>{" "}
            <Link href="/my-work">Back to My Work</Link>
          </>
        }
      />
    );
  if (success)
    return (
      <WorkspaceState
        title="Outcome saved"
        detail={`The ${label_(success.outcome)} outcome was recorded. Contact history is preserved${success.nextWorkId ? " and the next action was scheduled" : ""}.`}
        action={
          <Link className="primary" href="/my-work">
            Back to My Work
          </Link>
        }
      />
    );
  if (badResult) {
    const replacement = badResult.replacement;
    return (
      <WorkspaceState
        title="Bad Affiliate processed"
        detail={replacement?.status === "REPLACED"
          ? `The assignment was ended and replacement ${replacement.replacementUsername || replacement.replacementAffiliateId} was allocated.`
          : "The assignment was ended and its active work was cancelled. Replacement remains pending because no eligible same-brand affiliate is currently available."}
        action={<Link className="primary" href="/my-work">Return to My Work</Link>}
      />
    );
  }
  if (!workspace) return null;
  const active = ["PENDING", "IN_PROGRESS", "OVERDUE"].includes(
      workspace.work.status,
    ),
    executable = ["FIRST_CONTACT", "CALLBACK"].includes(
      workspace.work.workType,
    );
  return (
    <>
      <div className={styles.top}>
        <Link href="/my-work">← Back to My Work</Link>
        <span>{workspace.work.workId}</span>
      </div>
      <header className={styles.identity}>
        <div>
          <span className={styles.eyebrow}>Affiliate workspace</span>
          <h1>{workspace.affiliate.affiliateUsername}</h1>
          <p>
            {workspace.affiliate.affiliateName || "Full name not provided"} ·{" "}
            {workspace.brand.brandName ||
              workspace.brand.brandCode ||
              workspace.brand.brandId}
          </p>
        </div>
        <div className={styles.chips}>
          {[
            workspace.affiliate.lifecycleStatus,
            workspace.affiliate.prospectStatus,
            workspace.affiliate.telegramStatus,
            workspace.work.priority,
          ]
            .filter(Boolean)
            .map((value) => (
              <span key={value}>{label_(value)}</span>
            ))}
        </div>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.columns}>
        <section className="card">
          <h2>Contact information</h2>
          <dl className={styles.details}>
            <Detail label="Email" value={workspace.affiliate.email} />
            <Detail label="Phone" value={workspace.affiliate.phone} />
            <Detail
              label="Telegram"
              value={workspace.affiliate.telegramUsername}
            />
            <Detail
              label="Preferred channel"
              value={workspace.affiliate.preferredChannel}
            />
          </dl>
          <ContactActions
            item={{
              affiliateUsername: workspace.affiliate.affiliateUsername,
              email: workspace.affiliate.email,
              phone: workspace.affiliate.phone,
              telegramUsername: workspace.affiliate.telegramUsername,
            }}
          />
        </section>
        <section className="card">
          <h2>Current work</h2>
          <dl className={styles.details}>
            <Detail label="Work type" value={label_(workspace.work.workType)} />
            <Detail
              label="Channel"
              value={label_(workspace.work.workChannel)}
            />
            <Detail label="Status" value={label_(workspace.work.status)} />
            <Detail label="Assigned" value={date_(workspace.work.assignedAt)} />
            <Detail label="Due" value={date_(workspace.work.dueAt)} />
            <Detail label="Staff" value={workspace.assignment.staffName} />
          </dl>
        </section>
      </div>
      <section className={`card ${styles.outcome}`}>
        <div>
          <span className={styles.eyebrow}>Contact workflow</span>
          <h2>Record Contact Outcome</h2>
          <p className="muted">
            Record the result of this assigned {label_(workspace.work.workType)}
            {" "}work. The outcome will update the existing work history.
          </p>
        </div>
        {executable && active ? (
          <form onSubmit={submit}>
            <label>
              Outcome
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="CONNECTED">Connected</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="CALLBACK_REQUESTED">Callback Requested</option>
                <option value="WRONG_OR_INVALID_CONTACT">
                  Wrong or Invalid Contact
                </option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            {outcome === "CONNECTED" && (
              <>
                <label>
                  Telegram connection status
                  <select
                    value={telegramStatus}
                    onChange={(e) => setTelegramStatus(e.target.value)}
                  >
                    <option value="TELEGRAM_NOT_CONNECTED">
                      Not connected yet
                    </option>
                    <option value="TELEGRAM_CONNECTED">Connected</option>
                  </select>
                </label>
                {telegramStatus === "TELEGRAM_CONNECTED" && (
                  <label>
                    Telegram username
                    <input
                      name="telegramUsername"
                      maxLength={100}
                      defaultValue={workspace.affiliate.telegramUsername}
                    />
                  </label>
                )}
              </>
            )}
            {outcome === "CALLBACK_REQUESTED" && (
              <label>
                Callback date and time
                <input
                  name="callbackAt"
                  type="datetime-local"
                  min={localMin_()}
                  required
                />
              </label>
            )}
            <label>
              Notes
              <textarea
                name="notes"
                maxLength={1000}
                required={
                  outcome === "WRONG_OR_INVALID_CONTACT" || outcome === "OTHER"
                }
                placeholder={
                  outcome === "WRONG_OR_INVALID_CONTACT" || outcome === "OTHER"
                    ? "Required for this outcome"
                    : "Optional context for this attempt"
                }
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Record Outcome"}
            </button>
          </form>
        ) : (
          <div className={styles.notice}>
            {active
              ? "Processing for this work type is deliberately deferred."
              : "This work item is already complete or no longer active."}
          </div>
        )}
      </section>
      {active && (
        <section className={`card ${styles.badAffiliate}`}>
          <div>
            <span className={styles.eyebrow}>Assignment exception</span>
            <h2>Bad Affiliate</h2>
            <p className="muted">Use only when this affiliate is confirmed invalid.</p>
          </div>
          {!showBadAffiliate ? (
            <button className={styles.badTrigger} type="button" disabled={busy} onClick={() => setShowBadAffiliate(true)}>
              Mark as Bad Affiliate
            </button>
          ) : (
            <form className={styles.badConfirm} onSubmit={markBadAffiliate}>
              <p>This action will end the current assignment, cancel its active work, and immediately attempt a same-brand replacement. If none is available, replacement will remain pending.</p>
              <dl>
                <Detail label="Affiliate" value={workspace.affiliate.affiliateUsername} />
                <Detail label="Work ID" value={workspace.work.workId} />
              </dl>
              <label>
                Reason
                <textarea required maxLength={1000} value={badAffiliateNotes} onChange={(event) => setBadAffiliateNotes(event.target.value)} placeholder="Explain why this affiliate is invalid" />
              </label>
              <div className={styles.badActions}>
                <button type="button" disabled={busy} onClick={() => { setShowBadAffiliate(false); setBadAffiliateNotes(""); }}>Cancel</button>
                <button className={styles.badConfirmButton} disabled={busy || !badAffiliateNotes.trim()}>{busy ? "Processing…" : "Confirm Bad Affiliate"}</button>
              </div>
            </form>
          )}
        </section>
      )}
      {detail && <Activity events={detail.recentActivity} />}
    </>
  );
}
function AffiliateDirectory() {
  const [data, setData] = useState<AffiliateDirectoryResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState<DirectoryFilter>("all"),
    [page, setPage] = useState(1);
  const load = useCallback(async () => {
    const key = `affiliates:${page}:${filter}:${search.trim().toLowerCase()}`,
      cached = readCache<AffiliateDirectoryResponse>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else setLoading(true);
    setError("");
    try {
      const response = await api.listAffiliates(page, 50, { filter, search });
      if (page > 1 && !response.items.length && response.total > 0) {
        setPage(Math.max(1, Math.ceil(response.total / response.pageSize)));
        return;
      }
      setData(response);
      writeCache(key, response);
    } catch (cause) {
      const auth =
        cause instanceof ApiError &&
        ["UNAUTHENTICATED", "SESSION_EXPIRED", "FORBIDDEN"].includes(
          cause.code,
        );
      if (!cached || auth) {
        if (auth) {
          clearReadCache();
          setData(null);
        }
        setError(message_(cause));
      }
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);
  const items = data?.items || [],
    cards: Array<[string, number, DirectoryFilter]> = data
      ? [
          ["Total Affiliates", data.summary.totalAffiliates, "all"],
          ["Telegram Connected", data.summary.telegramConnected, "telegram"],
          ["Active Prospects", data.summary.activeProspects, "prospects"],
          ["Active Work", data.summary.activeWork, "work"],
        ]
      : [];
  return (
    <>
      <div className="section-head">
        <div>
          <h1>Affiliates</h1>
          <p className="muted">
            Permanent affiliates in your current assignment scope.
          </p>
        </div>
        {!loading && (
          <button className={styles.secondary} onClick={() => void load()}>
            Refresh
          </button>
        )}
      </div>
      {data && (
        <div className={styles.summaryCards}>
          {cards.map(([label, value, key]) => (
            <button
              type="button"
              aria-pressed={filter === key}
              className={`card ${filterStyles.summaryButton} ${filter === key ? filterStyles.summaryActive : ""}`}
              key={key}
              onClick={() => {
                setPage(1);
                setFilter(key);
              }}
            >
              <span>{label}</span>
              <b>{value}</b>
            </button>
          ))}
        </div>
      )}
      <div className={`${styles.search} ${filterStyles.search}`}>
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search username, name, contact, brand or status"
          aria-label="Search affiliates"
        />
        {data && (
          <p>
            {data.total} matching affiliate{data.total === 1 ? "" : "s"} ·
            Filter: {cards.find((x) => x[2] === filter)?.[0]}
          </p>
        )}
      </div>
      {loading && !data ? (
        <WorkspaceState
          title="Loading Affiliates…"
          detail="Retrieving permanent affiliate records in your scope."
        />
      ) : error ? (
        <WorkspaceState
          title="Unable to load Affiliates"
          detail={error}
          action={
            <button className="primary" onClick={() => void load()}>
              Retry
            </button>
          }
        />
      ) : !data?.summary.totalAffiliates ? (
        <WorkspaceState
          title="No affiliates found"
          detail="No affiliates exist in your authorized scope."
        />
      ) : !items.length ? (
        <WorkspaceState
          title="No matching affiliates"
          detail="Clear filters or try another search."
          action={
            <button
              onClick={() => {
                setSearch("");
                setFilter("all");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <DirectoryResults items={items} />
          <Pagination
            page={data!.page}
            pageSize={data!.pageSize}
            total={data!.total}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}
function DirectoryResults({ items }: { items: AffiliateDirectoryItem[] }) {
  return (
    <section className="card">
      <div className={styles.tableWrap}>
        <table className="table">
          <thead>
            <tr>
              <th>Affiliate</th>
              <th>Brand</th>
              <th>Contact</th>
              <th>Lifecycle</th>
              <th>Telegram</th>
              <th>Assigned Staff</th>
              <th>Last Contact</th>
              <th>Work</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.affiliateId}>
                <td>
                  <strong>{a.affiliateUsername}</strong>
                  <small>{a.affiliateName || "Name not provided"}</small>
                </td>
                <td>{a.brandName || a.brandCode || "—"}</td>
                <td>
                  <CopyValue label="Email" value={a.email} />
                  <CopyValue label="Phone" value={a.phone} />
                </td>
                <td>
                  <Status value={a.lifecycleStatus} />
                  <small>{label_(a.prospectStatus)}</small>
                </td>
                <td>
                  <Status value={a.telegramStatus} />
                  <CopyValue label="Telegram" value={a.telegramUsername} />
                </td>
                <td>{a.assignedStaffName || "Unassigned"}</td>
                <td>{date_(a.lastContactAt)}</td>
                <td>
                  {a.activeWorkCount}
                  {a.currentWorkType && (
                    <small>{label_(a.currentWorkType)}</small>
                  )}
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <Link
                      href={`/affiliates?affiliateId=${encodeURIComponent(a.affiliateId)}`}
                    >
                      View
                    </Link>
                    {a.email && (
                      <a
                        href={EMAIL_TOOL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Send Email
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.mobileDirectory}>
        {items.map((a) => (
          <article key={a.affiliateId}>
            <div>
              <strong>{a.affiliateUsername}</strong>
              <span>{a.affiliateName || "Name not provided"}</span>
            </div>
            <div className={styles.chips}>
              <Status value={a.lifecycleStatus} />
              <Status value={a.telegramStatus} />
            </div>
            <p>
              {a.brandName || a.brandCode || "No brand"} ·{" "}
              {a.assignedStaffName || "Unassigned"}
            </p>
            <CopyValue label="Email" value={a.email} />
            <CopyValue label="Phone" value={a.phone} />
            <div className={styles.rowActions}>
              <Link
                href={`/affiliates?affiliateId=${encodeURIComponent(a.affiliateId)}`}
              >
                View Affiliate
              </Link>
              {a.email && (
                <a
                  href={EMAIL_TOOL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Send Email
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
function AffiliateProfile({ affiliateId }: { affiliateId: string }) {
  const cacheKey = `affiliate:${affiliateId}`,
    [initial] = useState(() => readCache<AffiliateDetailResponse>(cacheKey)),
    [data, setData] = useState<AffiliateDetailResponse | null>(initial),
    [loading, setLoading] = useState(!initial),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await api.getAffiliateDetail(affiliateId);
      setData(response);
      writeCache(cacheKey, response);
    } catch (cause) {
      const auth =
        cause instanceof ApiError &&
        ["UNAUTHENTICATED", "SESSION_EXPIRED", "FORBIDDEN"].includes(
          cause.code,
        );
      if (!initial || auth) {
        if (auth) clearReadCache();
        setData(null);
        setError(message_(cause));
      }
    } finally {
      setLoading(false);
    }
  }, [affiliateId, cacheKey, initial]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading)
    return (
      <WorkspaceState
        title="Loading Affiliate 360…"
        detail="Retrieving profile and recent activity."
      />
    );
  if (error || !data)
    return (
      <WorkspaceState
        title="Affiliate unavailable"
        detail={error || "Affiliate not found."}
        action={
          <>
            <button className="primary" onClick={() => void load()}>
              Retry
            </button>
            <Link href="/affiliates">Back to Affiliates</Link>
          </>
        }
      />
    );
  const a = data.profile;
  return (
    <>
      <div className={styles.top}>
        <Link href="/affiliates">← Back to Affiliates</Link>
        <span>{a.affiliateId}</span>
      </div>
      <header className={styles.identity}>
        <div>
          <span className={styles.eyebrow}>Affiliate 360</span>
          <h1>{a.affiliateUsername}</h1>
          <p>
            {a.affiliateName || "Full name not provided"} ·{" "}
            {a.brandName || a.brandCode || a.brandId}
          </p>
        </div>
        <div className={styles.chips}>
          {[a.lifecycleStatus, a.prospectStatus, a.telegramStatus, a.priority]
            .filter(Boolean)
            .map((value) => (
              <span key={value}>{label_(value)}</span>
            ))}
        </div>
      </header>
      <div className={styles.columns}>
        <section className="card">
          <h2>Contact information</h2>
          <dl className={styles.details}>
            <Detail label="Email" value={a.email} />
            <Detail label="Phone" value={a.phone} />
            <Detail label="Telegram" value={a.telegramUsername} />
            <Detail label="Preferred channel" value={a.preferredChannel} />
          </dl>
          <ContactActions item={a} />
        </section>
        <section className="card">
          <h2>Assignment and activity</h2>
          <dl className={styles.details}>
            <Detail label="Assigned staff" value={a.assignedStaffName} />
            <Detail label="Assignment" value={a.assignmentId} />
            <Detail label="Active work" value={String(a.activeWorkCount)} />
            <Detail
              label="Current work"
              value={a.currentWorkType ? label_(a.currentWorkType) : ""}
            />
            <Detail label="Last contact" value={date_(a.lastContactAt)} />
            <Detail
              label="Meaningful contact"
              value={date_(a.lastMeaningfulContactAt)}
            />
          </dl>
          {data.canUpdatePerformance && a.currentWorkId && (
            <Link
              className={styles.primaryLink}
              href={`/affiliates?workId=${encodeURIComponent(a.currentWorkId)}`}
            >
              Open Current Work
            </Link>
          )}
        </section>
      </div>
      <PerformanceCompact data={data} />
      <Activity events={data.recentActivity} />
    </>
  );
}
function ContactActions({
  item,
}: {
  item: {
    affiliateId?: string;
    affiliateUsername: string;
    email: string;
    phone: string;
    telegramUsername: string;
  };
}) {
  return (
    <div className={styles.contactActions}>
      <CopyButton label="Copy Username" value={item.affiliateUsername} />
      <CopyButton label="Copy Email" value={item.email} />
      <CopyButton label="Copy Phone" value={item.phone} />
      <CopyButton label="Copy Telegram" value={item.telegramUsername} />
      {item.email ? (
        <a
          className={styles.sendEmail}
          href={EMAIL_TOOL_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Send Email
        </a>
      ) : (
        <button disabled>Send Email</button>
      )}
      {item.affiliateId && (
        <div className={styles.workflowActions}>
          <Link
            className={styles.contactPrimary}
            href={`/affiliates/contact-attempt?affiliateId=${encodeURIComponent(item.affiliateId)}`}
          >
            Record Contact Attempt
          </Link>
          <Link
            className={styles.contactSecondary}
            href={`/affiliates/update-details?affiliateId=${encodeURIComponent(item.affiliateId)}`}
          >
            Update Details
          </Link>
          <Link
            className={styles.contactSecondary}
            href={`/issues?affiliateId=${encodeURIComponent(item.affiliateId)}`}
          >
            Report Issue
          </Link>
        </div>
      )}
    </div>
  );
}
function CopyValue({ label, value }: { label: string; value: string }) {
  if (!value) return <small>{label}: —</small>;
  return (
    <span className={styles.copyValue}>
      <span>{value}</span>
      <CopyButton label={`Copy ${label}`} value={value} compact />
    </span>
  );
}
function CopyButton({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(value);
      else {
        const area = document.createElement("textarea");
        area.value = value;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      className={compact ? styles.copyCompact : styles.copyButton}
      type="button"
      onClick={() => void copy()}
      disabled={!value}
      aria-label={label}
    >
      {copied ? "Copied" : compact ? "Copy" : label}
    </button>
  );
}
function Status({ value }: { value: string }) {
  return <span className={styles.status}>{label_(value)}</span>;
}
function PerformanceCompact({ data }: { data: AffiliateDetailResponse }) {
  const p = data.performance,
    m = p?.current,
    prior = p?.previous;
  return (
    <section className={`card ${styles.activity}`}>
      <div className="section-head">
        <div>
          <h2>Performance · {p?.period || "Current Month"}</h2>
          <p className="muted">
            {p?.dataConflict
              ? "Performance record requires administrator review."
              : prior
                ? "Current snapshot with previous-month context."
                : "Current monthly affiliate snapshot."}
          </p>
          <p className="muted">
            Freshness:{" "}
            {p?.freshnessStatus?.toLowerCase().replace(/_/g, " ") ||
              "unavailable"}{" "}
            · Last successful update:{" "}
            {p?.lastSuccessfulUpdate
              ? new Date(p.lastSuccessfulUpdate).toLocaleString()
              : "—"}
          </p>
        </div>
        {data.canUpdatePerformance && (
          <Link
            className={styles.primaryLink}
            href={`/performance?affiliateId=${encodeURIComponent(data.profile.affiliateId)}`}
          >
            Update Performance
          </Link>
        )}
      </div>
      <div className={styles.summaryCards}>
        {[
          ["Registered", m?.registeredUsers, prior?.registeredUsers],
          ["FTDs", m?.ftd, prior?.ftd],
          ["Active", m?.activePlayers, prior?.activePlayers],
          ["Deposit", m?.totalDeposit, prior?.totalDeposit],
          ["Withdrawal", m?.totalWithdrawal, prior?.totalWithdrawal],
          ["Turnover", m?.totalTurnover, prior?.totalTurnover],
          ["P&L", m?.profitLoss, prior?.profitLoss],
          ["Net Cash Flow", m?.netCashFlow, prior?.netCashFlow],
          ["FTD Rate %", m?.ftdRate, prior?.ftdRate],
          ["Active Rate %", m?.activeRate, prior?.activeRate],
        ].map(([label, value, previous]) => (
          <section key={String(label)}>
            <span>{label}</span>
            <b>{value === undefined ? "—" : Number(value).toLocaleString()}</b>
            {previous !== undefined && (
              <small>Previous {Number(previous).toLocaleString()}</small>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
function Activity({ events }: { events: AffiliateActivity[] }) {
  return (
    <section className={`card ${styles.activity}`}>
      <div>
        <h2>Recent Activity</h2>
        <p className="muted">
          Recent contact attempts, interactions, work and follow-ups.
        </p>
      </div>
      {events.length ? (
        <div className={styles.timeline}>
          {events.map((e) => (
            <article key={`${e.type}-${e.id}`}>
              <span>{label_(e.type)}</span>
              <div>
                <strong>{label_(e.status || e.summary)}</strong>
                <p>
                  {[e.channel ? label_(e.channel) : "", e.summary, e.notes]
                    .filter(Boolean)
                    .join(" · ") || "No additional detail"}
                </p>
              </div>
              <time>{date_(e.timestamp)}</time>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">No activity has been recorded yet.</p>
      )}
    </section>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}
function WorkspaceState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="card empty-state">
      <div>
        <div className="empty-icon">◎</div>
        <h2>{title}</h2>
        <p className="muted">{detail}</p>
        {action && <div className={styles.stateAction}>{action}</div>}
      </div>
    </section>
  );
}
function message_(cause: unknown) {
  return cause instanceof ApiError
    ? cause.message
    : "The workspace request could not be completed.";
}
function label_(value: string) {
  return String(value || "—")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function date_(value: string) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
function localMin_() {
  const date = new Date(Date.now() + 60000),
    offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
