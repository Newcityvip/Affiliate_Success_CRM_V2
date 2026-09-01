"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  AffiliateLookupItem,
  IssueItem,
  IssuesResponse,
} from "../../lib/api-client";
import { clearReadCache, readCache, writeCache } from "../../lib/read-cache";
import { IssueCard, IssueFilters, toggleIssueCard } from "../../lib/issue-filters";
import { AffiliateLookup } from "../../components/affiliate-lookup";
import { Pagination } from "../../components/pagination";
import styles from "./issues.module.css";
const EMPTY: IssueFilters = {
  card: "all",
  search: "",
  status: "",
  priority: "",
  issueType: "",
  brand: "",
  staffId: "",
};
const TYPES = [
  "ACCOUNT",
  "PAYMENT",
  "COMMISSION",
  "TRACKING",
  "TECHNICAL",
  "CONTACT",
  "COMPLIANCE",
  "AFFILIATE_REQUEST",
  "OTHER",
];
export default function IssuesPage() {
  const [data, setData] = useState<IssuesResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [filters, setFilters] = useState<IssueFilters>(EMPTY),
    [page, setPage] = useState(1),
    [reporting, setReporting] = useState(false),
    [preselected, setPreselected] = useState("");
  useEffect(() => {
    const id =
      new URLSearchParams(window.location.search).get("affiliateId") || "";
    if (id) {
      setPreselected(id);
      setReporting(true);
    }
  }, []);
  const load = useCallback(async () => {
    const key = `issues:${page}:${JSON.stringify(filters)}`;
    const cached = readCache<IssuesResponse>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else setLoading(true);
    setError("");
    try {
      const r = await api.getIssues(page, 50, filters);
      if (page > 1 && !r.items.length && r.total > 0) {
        setPage(Math.max(1, Math.ceil(r.total / r.pageSize)));
        return;
      }
      setData(r);
      writeCache(key, r);
    } catch (c) {
      const auth =
        c instanceof ApiError &&
        ["UNAUTHENTICATED", "SESSION_EXPIRED", "FORBIDDEN"].includes(c.code);
      if (!cached || auth) {
        if (auth) {
          clearReadCache();
          setData(null);
        }
        setError(
          c instanceof ApiError ? c.message : "Issues could not be loaded.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [page, filters]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, filters.search]);
  const items = data?.items || [];
  const changeFilters = (next: IssueFilters) => { setPage(1); setFilters(next); };
  const cards: Array<[string, number, IssueCard]> = data
    ? [
        ["Open", data.summary.open, "OPEN"],
        ["In Progress", data.summary.inProgress, "IN_PROGRESS"],
        ["Urgent", data.summary.urgent, "URGENT"],
        ["Resolved", data.summary.resolved, "RESOLVED"],
        ["Closed", data.summary.closed, "CLOSED"],
      ]
    : [];
  return (
    <>
      <div className="section-head">
        <div>
          <h1>Issues</h1>
          <p className="muted">
            Affiliate escalations, operational blockers, and permanent
            resolution history.
          </p>
        </div>
        <div className={styles.head}>
          <button className="primary" onClick={() => setReporting((v) => !v)}>
            + Report Issue
          </button>
          <button onClick={() => void load()}>Refresh</button>
        </div>
      </div>
      {success && <p className="success-message">{success}</p>}
      {reporting && data && (
        <ReportIssue
          data={data}
          initialAffiliateId={preselected}
          onCancel={() => setReporting(false)}
          onDone={async () => {
            setReporting(false);
            setPreselected("");
            setSuccess("Issue reported successfully.");
            await load();
          }}
        />
      )}
      {data && (
        <>
          <div className={styles.summary}>
            {cards.map(([label, n, key]) => (
              <button
                className={`card ${styles.summaryButton} ${filters.card === key ? styles.active : ""}`}
                aria-pressed={filters.card === key}
                key={key}
                onClick={() =>
                  changeFilters({ ...filters, card: toggleIssueCard(filters.card, key) })
                }
              >
                <span>{label}</span>
                <b>{n}</b>
              </button>
            ))}
          </div>
          <Filters data={data} value={filters} onChange={changeFilters} />
        </>
      )}
      {loading && !data ? (
        <State
          title="Loading issues…"
          detail="Retrieving escalations in your authorized scope."
        />
      ) : error ? (
        <State
          title="Unable to load Issues"
          detail={error}
          action={
            <button className="primary" onClick={() => void load()}>
              Retry
            </button>
          }
        />
      ) : data && Object.values(data.summary).every((value) => value === 0) ? (
        <State
          title="No issues reported"
          detail="No issue history exists in your current scope."
        />
      ) : !items.length ? (
        <State
          title="No matching issues"
          detail="Adjust or clear the selected filters."
          action={
            <button onClick={() => changeFilters(EMPTY)}>Clear filters</button>
          }
        />
      ) : (
        <><IssueList items={items} data={data!} onChanged={async()=>{setSuccess("Issue updated successfully.");await load()}} /><Pagination page={data!.page} pageSize={data!.pageSize} total={data!.total} onPageChange={setPage}/></>
      )}
    </>
  );
}
function Filters({
  data,
  value,
  onChange,
}: {
  data: IssuesResponse;
  value: IssueFilters;
  onChange: (v: IssueFilters) => void;
}) {
  const brands = data.options.brands || [];
  return (
    <div className={styles.filters}>
      <input
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="Search issue, affiliate, reporter or resolution"
      />
      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
      >
        <option value="">All statuses</option>
        {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <select
        value={value.priority}
        onChange={(e) => onChange({ ...value, priority: e.target.value })}
      >
        <option value="">All priorities</option>
        {["LOW", "NORMAL", "HIGH", "URGENT"].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <select
        value={value.issueType}
        onChange={(e) => onChange({ ...value, issueType: e.target.value })}
      >
        <option value="">All types</option>
        {TYPES.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <select
        value={value.brand}
        onChange={(e) => onChange({ ...value, brand: e.target.value })}
      >
        <option value="">All brands</option>
          {brands.map((brand) => (
            <option value={brand.brandId} key={brand.brandId}>
              {brand.brandName}
          </option>
        ))}
      </select>
      {data.canManage && (
        <select
          value={value.staffId}
          onChange={(e) => onChange({ ...value, staffId: e.target.value })}
        >
          <option value="">All staff</option>
          {data.options.staff.map((x) => (
            <option value={x.staffId} key={x.staffId}>
              {x.displayName}
            </option>
          ))}
        </select>
      )}
      <button onClick={() => onChange(EMPTY)}>Clear</button>
    </div>
  );
}
function IssueList({
  items,
  data,
  onChanged,
}: {
  items: IssueItem[];
  data: IssuesResponse;
  onChanged: () => Promise<void>;
}) {
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>Issue register</h2>
          <p className="muted">
            {items.length} record{items.length === 1 ? "" : "s"} · history is
            never deleted
          </p>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className="table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Affiliate</th>
              <th>Brand</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Reported By</th>
              <th>Updated</th>
              <th>Owner</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr
                className={
                  x.priority === "URGENT" && x.status !== "CLOSED"
                    ? styles.urgentRow
                    : ""
                }
                key={x.issueId}
              >
                <td>
                  <strong>{x.title}</strong>
                  <small>{x.issueId}</small>
                </td>
                <td>
                  <strong>
                    {x.affiliateUsername || "Unavailable affiliate"}
                  </strong>
                  <small>{x.affiliateName}</small>
                </td>
                <td>{x.brandName || x.brandCode || "—"}</td>
                <td>{label_(x.issueType)}</td>
                <td>
                  <Badge value={x.priority} />
                </td>
                <td>
                  <Badge value={x.status} />
                </td>
                <td>{x.reportedByName}</td>
                <td>{date_(x.updatedAt)}</td>
                <td>{x.assignedToName || "Unassigned"}</td>
                <td>
                  <IssueDetail issue={x} data={data} onChanged={onChanged} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.mobile}>
        {items.map((x) => (
          <article key={x.issueId}>
            <strong>{x.title}</strong>
            <span>
              {x.affiliateUsername} · {x.brandName || x.brandCode || "No brand"}
            </span>
            <div className={styles.badges}>
              <Badge value={x.priority} />
              <Badge value={x.status} />
            </div>
            <p>
              {label_(x.issueType)} · reported by {x.reportedByName}
            </p>
            <IssueDetail issue={x} data={data} onChanged={onChanged} />
          </article>
        ))}
      </div>
    </section>
  );
}
function IssueDetail({
  issue,
  data,
  onChanged,
}: {
  issue: IssueItem;
  data: IssuesResponse;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [resolution, setResolution] = useState(""),
    [owner, setOwner] = useState(issue.assignedToId);
  async function act(run: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await run();
      await onChanged();
    } catch (c) {
      setError(c instanceof ApiError ? c.message : "Issue update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Open"}
      </button>
      {open && (
        <div
          className={styles.detail}
          role="dialog"
          aria-modal="true"
          aria-label={`Issue ${issue.issueId}`}
        >
          <div className="section-head">
            <div>
              <h2>{issue.title}</h2>
              <p className="muted">{issue.issueId}</p>
            </div>
            <div className={styles.head}>
              <Link
                href={`/affiliates?affiliateId=${encodeURIComponent(issue.affiliateId)}`}
              >
                View Affiliate
              </Link>
              <button type="button" onClick={() => setOpen(false)}>
                Close Detail
              </button>
            </div>
          </div>
          <dl>
            <Field
              label="Affiliate"
              value={`${issue.affiliateUsername} ${issue.affiliateName}`}
            />
            <Field label="Brand" value={issue.brandName || issue.brandCode} />
            <Field label="Type" value={label_(issue.issueType)} />
            <Field label="Priority" value={label_(issue.priority)} />
            <Field label="Status" value={label_(issue.status)} />
            <Field label="Reported by" value={issue.reportedByName} />
            <Field label="Owner" value={issue.assignedToName || "Unassigned"} />
            <Field label="Created" value={date_(issue.createdAt)} />
            <Field label="Updated" value={date_(issue.updatedAt)} />
            <Field label="Resolved" value={date_(issue.resolvedAt)} />
          </dl>
          <section>
            <h3>Description</h3>
            <p>{issue.description}</p>
          </section>
          <section>
            <h3>Resolution history</h3>
            <pre>{issue.resolution || "No resolution recorded."}</pre>
          </section>
          {error && <p className="error-message">{error}</p>}
          {data.canManage && (
            <div className={styles.adminActions}>
              {issue.status === "OPEN" && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void act(() =>
                      api.updateIssueStatus(issue.issueId, "IN_PROGRESS"),
                    )
                  }
                >
                  Mark In Progress
                </button>
              )}
              {["OPEN", "IN_PROGRESS"].includes(issue.status) && (
                <>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Resolution notes required"
                  />
                  <button
                    className="primary"
                    disabled={busy || !resolution.trim()}
                    onClick={() =>
                      void act(() =>
                        api.updateIssueStatus(
                          issue.issueId,
                          "RESOLVED",
                          resolution,
                        ),
                      )
                    }
                  >
                    {busy ? "Resolving…" : "Resolve"}
                  </button>
                </>
              )}
              {issue.status === "RESOLVED" && (
                <>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(() =>
                        api.updateIssueStatus(
                          issue.issueId,
                          "IN_PROGRESS",
                          "Further investigation required",
                        ),
                      )
                    }
                  >
                    Reopen
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("Close this resolved issue?"))
                        void act(() =>
                          api.updateIssueStatus(issue.issueId, "CLOSED"),
                        );
                    }}
                  >
                    {busy ? "Closing…" : "Close"}
                  </button>
                </>
              )}
              {issue.status !== "CLOSED" && (
                <>
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                  >
                    {data.options.staff.map((s) => (
                      <option value={s.staffId} key={s.staffId}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                  {owner && owner !== issue.assignedToId && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act(() => api.assignIssue(issue.issueId, owner))
                      }
                    >
                      Reassign
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
function ReportIssue({
  data,
  initialAffiliateId,
  onCancel,
  onDone,
}: {
  data: IssuesResponse;
  initialAffiliateId: string;
  onCancel: () => void;
  onDone: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<AffiliateLookupItem | null>(null),
    [issueType, setIssueType] = useState("ACCOUNT"),
    [priority, setPriority] = useState("NORMAL"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !selected) return;
    setBusy(true);
    setError("");
    try {
      await api.createIssue({
        affiliateId: selected.affiliateId,
        issueType,
        priority,
        title,
        description,
        staffId: "IGNORED",
        brandId: "IGNORED",
      });
      await onDone();
    } catch (c) {
      setError(
        c instanceof ApiError ? c.message : "Issue could not be reported.",
      );
      setBusy(false);
    }
  }
  return (
    <form className={`card ${styles.report}`} onSubmit={submit}>
      <div className="section-head">
        <div>
          <h2>Report Issue</h2>
          <p className="muted">
            Only affiliates in your current authorized scope are available.
          </p>
        </div>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className={styles.formGrid}>
        <AffiliateLookup
          required
          initialId={initialAffiliateId}
          onSelect={setSelected}
        />
        <label>
          Issue Type *
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
          >
            {TYPES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Priority *
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {["LOW", "NORMAL", "HIGH", "URGENT"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Title *
          <input
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className={styles.wide}>
          Description / Notes *
          <textarea
            required
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      <button className="primary" disabled={busy || !selected}>
        {busy ? "Reporting…" : "Report Issue"}
      </button>
    </form>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`${styles.badge} ${value === "URGENT" ? styles.urgent : ""}`}
    >
      {label_(value)}
    </span>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}
function State({
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
        <div className="empty-icon">!</div>
        <h2>{title}</h2>
        <p className="muted">{detail}</p>
        {action}
      </div>
    </section>
  );
}
function label_(v: string) {
  return String(v || "—")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function date_(v: string) {
  if (!v) return "Not recorded";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}
