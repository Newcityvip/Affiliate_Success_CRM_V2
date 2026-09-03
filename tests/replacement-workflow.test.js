const assert = require("assert"),
  fs = require("fs"),
  vm = require("vm");
function environment({ pool = true } = {}) {
  const data = {
      Affiliates: [
        {
          Affiliate_ID: "AFF1",
          Affiliate_Username: "old.user",
          Affiliate_Name: "Old User",
          Email: "old@example.com",
          Phone: "111",
          Brand_ID: "B1",
          Telegram_Username: "",
          Telegram_Status: "NOT_CONNECTED",
          Lifecycle_Status: "ASSIGNED",
          Prospect_Status: "NEW",
          Archive_Status: "ACTIVE",
        },
      ],
      Assignments: [
        {
          Assignment_ID: "ASN1",
          Affiliate_ID: "AFF1",
          Staff_ID: "S1",
          Brand_ID: "B1",
          Assignment_Type: "PROSPECT",
          Status: "ACTIVE",
        },
      ],
      Work_Items: [
        {
          Work_ID: "W1",
          Affiliate_ID: "AFF1",
          Assignment_ID: "ASN1",
          Staff_ID: "S1",
          Work_Type: "FIRST_CONTACT",
          Priority: "NORMAL",
          Status: "PENDING",
          Due_At: "2026-09-01T00:00:00.000Z",
        },
      ],
      Contact_Attempts: [],
      Interactions: [],
      Followups: [
        {
          Followup_ID: "F1",
          Affiliate_ID: "AFF1",
          Assignment_ID: "ASN1",
          Staff_ID: "S1",
          Status: "PENDING",
        },
      ],
      Affiliate_Pool: pool
        ? [
            {
              Affiliate_Username: "first.new",
              Full_Name: "First New",
              Email: "first@example.com",
              Phone_Number: "222",
              Brand: "ALPHA",
            },
            {
              Affiliate_Username: "other.brand",
              Full_Name: "Other",
              Email: "other@example.com",
              Phone_Number: "333",
              Brand: "BETA",
            },
            {
              Affiliate_Username: "second.new",
              Full_Name: "Second New",
              Email: "second@example.com",
              Phone_Number: "444",
              Brand: "ALPHA",
            },
          ]
        : [{ Affiliate_Username: "other.brand", Brand: "BETA" }],
      Brand_List: [
        {
          Brand_ID: "B1",
          Brand_Name: "Alpha",
          Brand_Code: "ALPHA",
          Market: "LK",
          Default_Language: "EN",
        },
        { Brand_ID: "B2", Brand_Name: "Beta", Brand_Code: "BETA" },
      ],
      Audit_Log: [],
    },
    counters = {};
  const context = {
    console,
    Date,
    String,
    Number,
    Boolean,
    Array,
    Math,
    JSON,
    isFinite,
    Error,
    apiError_: (code, message) => Object.assign(new Error(message), { code }),
    requireRole_: (u, roles) => {
      if (!roles.includes(u.Role))
        throw context.apiError_("FORBIDDEN", "Denied");
    },
    rows_: (name) => data[name],
    clearCache_: () => {},
    now_: () => new Date().toISOString(),
    config_: (key) =>
      key === "ATTEMPT_TWO_WAIT_HOURS"
        ? 72
        : key === "ATTEMPT_THREE_WAIT_HOURS"
          ? 120
          : 24,
    safeSheetText_: (v, max) => {
      let s = String(v || "")
        .trim()
        .slice(0, max || 1000);
      return /^[=+\-@]/.test(s) ? "'" + s : s;
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
    },
    reserveIdsUnlocked_: (entity, count) =>
      Array.from({ length: count }, () => {
        counters[entity] = (counters[entity] || 0) + 1;
        return (
          {
            Attempt: "ATM",
            Interaction: "INT",
            Followup: "FUP",
            Affiliate: "AFF",
            Assignment: "ASN",
            Work: "WRK",
          }[entity] + String(counters[entity]).padStart(6, "0")
        );
      }),
    appendRows_: (name, rows) =>
      data[name].push(...rows.map((x) => ({ ...x }))),
    updateById_: (name, column, id, changes) => {
      const row = data[name].find((x) => String(x[column]) === String(id));
      if (!row) return null;
      const before = { ...row };
      Object.assign(row, changes);
      return before;
    },
    updateRowsWhere_: (name, predicate, changes) => {
      const updated = [];
      data[name].forEach((row) => {
        if (predicate(row)) {
          updated.push({ ...row });
          Object.assign(
            row,
            typeof changes === "function" ? changes(row) : changes,
          );
        }
      });
      return updated;
    },
    sheet_: (name) => ({ deleteRow: (row) => data[name].splice(row - 2, 1) }),
    audit_: (u, action, type, id, affiliateId, before, after) =>
      data.Audit_Log.push({ action, type, id, affiliateId, before, after }),
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("backend/Workflow.gs", "utf8"), context);
  vm.runInContext(fs.readFileSync("backend/Replacement.gs", "utf8"), context);
  return { context, data };
}
const owner = { Staff_ID: "S1", Username: "owner", Role: "STAFF" },
  other = { Staff_ID: "S2", Username: "other", Role: "STAFF" };
function oldAttempts(data, count, assignment = "ASN1") {
  for (let i = 0; i < count; i++)
    data.Contact_Attempts.push({
      Attempt_ID: `OLD${assignment}${i}`,
      Affiliate_ID: "AFF1",
      Assignment_ID: assignment,
      Staff_ID: "S1",
      Attempt_Number: i + 1,
      Channel: "CALL",
      Attempt_At: new Date(
        Date.now() - (count - i) * 121 * 3600000,
      ).toISOString(),
      Result: "NO_ANSWER",
      Notes: "",
    });
}
{
  const { context, data } = environment();
  data.Contact_Attempts.push({
    Attempt_ID: "PRIOR",
    Affiliate_ID: "AFF1",
    Assignment_ID: "ENDED",
    Staff_ID: "S1",
    Attempt_Number: 9,
    Channel: "CALL",
    Attempt_At: "2020-01-01T00:00:00.000Z",
    Result: "NO_ANSWER",
  });
  let workspace = context.prospectWorkspace_(owner, { affiliateId: "AFF1" });
  assert.equal(workspace.replacementAttemptCount, 0);
  const one = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "NO_ANSWER",
    staffId: "S2",
    assignmentId: "FAKE",
    attemptNumber: 99,
  });
  assert.equal(one.attemptCount, 1);
  assert.equal(data.Contact_Attempts.at(-1).Staff_ID, "S1");
  assert.equal(data.Contact_Attempts.at(-1).Assignment_ID, "ASN1");
  assert.equal(data.Contact_Attempts.at(-1).Attempt_Number, 1);
  assert.throws(
    () =>
      context.recordProspectAttempt_(owner, {
        affiliateId: "AFF1",
        channel: "EMAIL",
        outcome: "UNREACHABLE",
      }),
    (e) => e.code === "INVALID_STATE",
  );
  data.Contact_Attempts.at(-1).Attempt_At = "2020-01-01T00:00:00.000Z";
  context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "EMAIL",
    outcome: "UNREACHABLE",
  });
  data.Contact_Attempts.at(-1).Attempt_At = "2020-01-04T00:00:00.000Z";
  const third = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "WHATSAPP",
    outcome: "WRONG_CONTACT",
    notes: "Number belongs to another person",
  });
  assert.equal(third.replacementEligible, true);
  assert.equal(data.Assignments[0].Status, "ACTIVE");
  assert.equal(data.Affiliate_Pool.length, 3);
  assert.ok(
    data.Audit_Log.some((x) => x.action === "PROSPECT_REPLACEMENT_ELIGIBLE"),
  );
  assert.throws(
    () => context.prospectWorkspace_(other, { affiliateId: "AFF1" }),
    (e) => e.code === "FORBIDDEN",
  );
}
{
  const { context, data } = environment();
  const first = context.submitFirstContactOutcome_(owner, {
    workId: "W1",
    outcome: "NO_ANSWER",
    notes: "My Work first qualifying failure",
  });
  assert.equal(data.Contact_Attempts.length, 1);
  assert.equal(data.Contact_Attempts[0].Work_ID, "W1");
  assert.equal(data.Contact_Attempts[0].Staff_ID, "S1");
  assert.equal(context.prospectWorkspace_(owner, { affiliateId: "AFF1" }).replacementAttemptCount, 1);
  assert.throws(
    () => context.submitFirstContactOutcome_(owner, { workId: "W1", outcome: "NO_ANSWER" }),
    (e) => e.code === "INVALID_STATE",
  );
  assert.equal(data.Contact_Attempts.length, 1);
  data.Contact_Attempts[0].Attempt_At = new Date(Date.now() - 200 * 3600000).toISOString();
  const second = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "UNREACHABLE",
  });
  assert.equal(second.replacementAttemptCount, 2);
  assert.throws(
    () => context.recordProspectAttempt_(owner, { affiliateId: "AFF1", channel: "CALL", outcome: "WRONG_CONTACT", notes: "Still invalid" }),
    (e) => e.code === "INVALID_STATE",
  );
  assert.equal(data.Contact_Attempts.length, 2);
  data.Contact_Attempts[1].Attempt_At = new Date(Date.now() - 121 * 3600000).toISOString();
  const third = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "WRONG_CONTACT",
    notes: "Confirmed wrong contact",
  });
  assert.equal(third.replacementAttemptCount, 3);
  assert.equal(third.replacementEligible, true);
  assert.deepEqual(data.Contact_Attempts.map((x) => x.Attempt_Number), [1, 2, 3]);
  assert.equal(context.prospectWorkspace_(owner, { affiliateId: "AFF1" }).attempts.length, 3);
  assert.equal(first.nextWorkId, data.Work_Items[1].Work_ID);
}
{
  const { context, data } = environment();
  const first = context.submitFirstContactOutcome_(owner, { workId: "W1", outcome: "NO_ANSWER" });
  data.Contact_Attempts[0].Attempt_At = new Date(Date.now() - 73 * 3600000).toISOString();
  context.submitFirstContactOutcome_(owner, {
    workId: first.nextWorkId,
    outcome: "WRONG_OR_INVALID_CONTACT",
    notes: "My Work invalid contact",
  });
  assert.equal(data.Contact_Attempts.length, 2);
  assert.equal(data.Contact_Attempts[1].Result, "WRONG_OR_INVALID_CONTACT");
  assert.equal(context.prospectWorkspace_(owner, { affiliateId: "AFF1" }).replacementAttemptCount, 2);
}
{
  const { context, data } = environment();
  oldAttempts(data, 3);
  const r = context.requestProspectReplacement_(owner, { affiliateId: "AFF1" });
  assert.equal(r.status, "REPLACED");
  assert.equal(r.replacementUsername, "first.new");
  assert.equal(data.Affiliate_Pool.length, 2);
  assert.equal(data.Affiliate_Pool[0].Affiliate_Username, "other.brand");
  assert.equal(data.Assignments[0].Status, "ENDED");
  assert.equal(data.Assignments[0].End_Reason, "CONTACT_ATTEMPTS_EXHAUSTED");
  assert.equal(data.Assignments[1].Previous_Assignment_ID, "ASN1");
  assert.equal(data.Assignments[1].Staff_ID, "S1");
  assert.equal(data.Work_Items[0].Status, "CANCELLED");
  assert.equal(data.Work_Items[1].Work_Type, "FIRST_CONTACT");
  assert.equal(data.Followups[0].Status, "COMPLETED");
  assert.equal(data.Contact_Attempts.length, 3);
  const again = context.requestProspectReplacement_(owner, {
    affiliateId: "AFF1",
  });
  assert.equal(again.replacementAffiliateId, r.replacementAffiliateId);
  assert.equal(data.Assignments.length, 2);
  assert.equal(data.Affiliate_Pool.length, 2);
  assert.ok(data.Audit_Log.some((x) => x.action === "PROSPECT_REPLACED"));
}
{
  const { context, data } = environment();
  assert.throws(
    () =>
      context.recordProspectAttempt_(owner, {
        affiliateId: "AFF1",
        channel: "CALL",
        outcome: "BAD_AFFILIATE",
      }),
    (e) => e.code === "VALIDATION_FAILED",
  );
  const r = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "BAD_AFFILIATE",
    notes: "Confirmed fraudulent details",
  });
  assert.equal(r.replacement.status, "REPLACED");
  assert.equal(data.Contact_Attempts.length, 1);
  assert.equal(data.Assignments[0].End_Reason, "BAD_AFFILIATE");
  assert.ok(data.Audit_Log.some((x) => x.action === "BAD_AFFILIATE_MARKED"));
}
{
  const { context, data } = environment({ pool: false });
  oldAttempts(data, 3);
  const r = context.requestProspectReplacement_(owner, { affiliateId: "AFF1" });
  assert.equal(r.status, "PENDING");
  assert.match(r.message, /no eligible affiliates/i);
  assert.equal(data.Affiliate_Pool[0].Brand, "BETA");
  assert.equal(data.Affiliates[0].Prospect_Status, "REPLACEMENT_PENDING");
  assert.equal(data.Assignments[0].Status, "ENDED");
  assert.equal(data.Assignments.length, 1);
  const again = context.requestProspectReplacement_(owner, {
    affiliateId: "AFF1",
  });
  assert.equal(again.status, "PENDING");
  assert.equal(data.Assignments.length, 1);
  data.Affiliate_Pool.push({
    Affiliate_Username: "later.new",
    Full_Name: "Later New",
    Email: "later@example.com",
    Phone_Number: "555",
    Brand: "ALPHA",
  });
  const allocated = context.requestProspectReplacement_(owner, {
    affiliateId: "AFF1",
  });
  assert.equal(allocated.status, "REPLACED");
  assert.equal(allocated.replacementUsername, "later.new");
  assert.equal(data.Assignments.length, 2);
  assert.ok(
    data.Audit_Log.some((x) => x.action === "PROSPECT_REPLACEMENT_PENDING"),
  );
}
{
  const { context, data } = environment();
  const r = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "TELEGRAM",
    outcome: "CONNECTED",
    telegramStatus: "TELEGRAM_NOT_CONNECTED",
    notes: "Connected successfully",
  });
  assert.equal(r.replacement, null);
  assert.equal(data.Assignments[0].Status, "ACTIVE");
  assert.equal(data.Affiliates[0].Lifecycle_Status, "CONNECTED");
  assert.equal(data.Work_Items[0].Status, "COMPLETED");
  assert.equal(data.Work_Items[1].Work_Type, "TELEGRAM_ONBOARDING");
  assert.equal(data.Interactions.length, 1);
  data.Assignments[0].Status = "ENDED";
  assert.throws(
    () => context.prospectWorkspace_(owner, { affiliateId: "AFF1" }),
    (e) => e.code === "FORBIDDEN",
  );
}
{
  const { context, data } = environment();
  const workspace = context.prospectWorkspace_(owner, { affiliateId: "AFF1" });
  assert.equal(workspace.affiliate.telegramStatus, "NOT_CONNECTED");
  assert.equal(workspace.affiliate.telegramUsername, "");
  const r = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "CONNECTED",
    telegramStatus: "TELEGRAM_CONNECTED",
    telegramUsername: "  @connected_user  ",
    staffId: "S2",
    assignmentId: "FAKE",
  });
  assert.equal(r.replacement, null);
  assert.equal(data.Contact_Attempts.length, 1);
  assert.equal(data.Contact_Attempts[0].Result_Detail, "TELEGRAM_CONNECTED");
  assert.equal(data.Contact_Attempts[0].Attempt_Number, 1);
  assert.equal(data.Contact_Attempts[0].Staff_ID, "S1");
  assert.equal(data.Contact_Attempts[0].Assignment_ID, "ASN1");
  assert.equal(data.Affiliates[0].Telegram_Status, "CONNECTED");
  assert.equal(data.Affiliates[0].Telegram_Username, "'@connected_user");
  assert.equal(data.Affiliates[0].Lifecycle_Status, "TELEGRAM_CONNECTED");
  assert.ok(data.Affiliates[0].Telegram_Connected_At);
  assert.equal(data.Work_Items.length, 1);
  assert.equal(data.Work_Items[0].Status, "COMPLETED");
  assert.equal(data.Interactions.length, 1);
}
{
  const { context, data } = environment();
  context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "CONNECTED",
    telegramStatus: "TELEGRAM_NOT_CONNECTED",
    telegramUsername: "@must_not_be_saved",
  });
  assert.equal(data.Affiliates[0].Telegram_Status, "NOT_CONNECTED");
  assert.equal(data.Affiliates[0].Telegram_Username, "'@must_not_be_saved");
  assert.equal(data.Affiliates[0].Lifecycle_Status, "CONNECTED");
  assert.equal(data.Affiliates[0].Telegram_Connected_At, undefined);
  assert.equal(data.Work_Items.filter((x) => x.Work_Type === "TELEGRAM_ONBOARDING").length, 1);
}
{
  const { context, data } = environment();
  assert.throws(
    () => context.recordProspectAttempt_(owner, { affiliateId: "AFF1", channel: "CALL", outcome: "CONNECTED" }),
    (e) => e.code === "VALIDATION_FAILED",
  );
  assert.equal(data.Contact_Attempts.length, 0);
  context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "CONNECTED",
    telegramStatus: "TELEGRAM_CONNECTED",
    telegramUsername: "",
  });
  assert.equal(data.Affiliates[0].Telegram_Status, "CONNECTED");
  assert.equal(data.Affiliates[0].Telegram_Username, "");
}
{
  const { context, data } = environment();
  data.Work_Items.push({
    ...data.Work_Items[0],
    Work_ID: "TG1",
    Work_Type: "TELEGRAM_ONBOARDING",
    Work_Channel: "TELEGRAM",
    Due_At: "2026-09-02T00:00:00.000Z",
  });
  context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "CONNECTED",
    telegramStatus: "TELEGRAM_NOT_CONNECTED",
  });
  assert.equal(data.Work_Items.filter((x) => x.Work_Type === "TELEGRAM_ONBOARDING").length, 1);
  assert.equal(data.Work_Items.find((x) => x.Work_ID === "TG1").Status, "PENDING");
}
{
  const { context, data } = environment();
  const first = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "NO_ANSWER",
    notes: "Production test - first contact attempt, no answer.",
  });
  assert.equal(first.replacementAttemptCount, 1);
  assert.equal(first.replacementEligible, false);
  assert.equal(first.replacement, null);
  assert.equal(data.Contact_Attempts.length, 1);
  let workspace = context.prospectWorkspace_(owner, { affiliateId: "AFF1" });
  assert.equal(workspace.replacementAttemptCount, 1);
  assert.equal(workspace.attempts.length, 1);
  assert.equal(workspace.attempts[0].outcome, "NO_ANSWER");
  assert.throws(
    () =>
      context.recordProspectAttempt_(owner, {
        affiliateId: "AFF1",
        channel: "CALL",
        outcome: "UNREACHABLE",
      }),
    (e) => e.code === "INVALID_STATE",
  );
  workspace = context.prospectWorkspace_(owner, { affiliateId: "AFF1" });
  assert.equal(data.Contact_Attempts.length, 1);
  assert.equal(workspace.replacementAttemptCount, 1);
  assert.equal(workspace.replacementEligible, false);
}
{
  const { context, data } = environment();
  context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "NO_ANSWER",
  });
  data.Contact_Attempts[0].Attempt_At = new Date(
    Date.now() - 72 * 3600000 - 1000,
  ).toISOString();
  const second = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "EMAIL",
    outcome: "UNREACHABLE",
  });
  assert.equal(second.replacementAttemptCount, 2);
  assert.equal(second.replacementEligible, false);
  assert.throws(
    () =>
      context.recordProspectAttempt_(owner, {
        affiliateId: "AFF1",
        channel: "CALL",
        outcome: "WRONG_CONTACT",
        notes: "Wrong number",
      }),
    (e) => e.code === "INVALID_STATE",
  );
  data.Contact_Attempts[0].Attempt_At = new Date(
    Date.now() - 200 * 3600000,
  ).toISOString();
  data.Contact_Attempts[1].Attempt_At = new Date(
    Date.now() - 120 * 3600000 - 1000,
  ).toISOString();
  const third = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "WRONG_CONTACT",
    notes: "Wrong number",
  });
  assert.equal(third.replacementAttemptCount, 3);
  assert.equal(third.replacementEligible, true);
}
for (const prior of [1, 2]) {
  const { context, data } = environment();
  oldAttempts(data, prior);
  const r = context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel: "CALL",
    outcome: "BAD_AFFILIATE",
    notes: "Confirmed invalid affiliate",
  });
  assert.equal(r.replacement.status, "REPLACED");
  assert.equal(data.Assignments[0].End_Reason, "BAD_AFFILIATE");
}
for (const outcome of [
  "CONNECTED",
  "NO_ANSWER",
  "UNREACHABLE",
  "WRONG_CONTACT",
  "CALLBACK_REQUESTED",
  "BAD_AFFILIATE",
  "OTHER",
]) {
  const { context, data } = environment(),
    payload = {
      affiliateId: "AFF1",
      channel: "CALL",
      outcome,
      notes: ["WRONG_CONTACT", "BAD_AFFILIATE", "OTHER"].includes(outcome)
        ? "Required explanatory note"
        : "Outcome contract test",
    };
  if (outcome === "CONNECTED") payload.telegramStatus = "TELEGRAM_NOT_CONNECTED";
  if (outcome === "CALLBACK_REQUESTED")
    payload.nextContactAt = new Date(Date.now() + 86400000).toISOString();
  context.recordProspectAttempt_(owner, payload);
  assert.equal(
    data.Contact_Attempts.length,
    1,
    `${outcome} must create exactly one attempt`,
  );
  assert.equal(data.Contact_Attempts[0].Result, outcome);
}
for (const channel of ["CALL", "WHATSAPP", "TELEGRAM", "EMAIL", "OTHER"]) {
  const { context, data } = environment();
  context.recordProspectAttempt_(owner, {
    affiliateId: "AFF1",
    channel,
    outcome: "NO_ANSWER",
  });
  assert.equal(data.Contact_Attempts.length, 1);
  assert.equal(data.Contact_Attempts[0].Channel, channel);
}
for (const outcome of ["", "NO ANSWER", "ARBITRARY"]) {
  const { context, data } = environment();
  assert.throws(
    () =>
      context.recordProspectAttempt_(owner, {
        affiliateId: "AFF1",
        channel: "CALL",
        outcome,
      }),
    (e) => e.code === "VALIDATION_FAILED",
  );
  assert.equal(data.Contact_Attempts.length, 0);
}
{
  const { context, data } = environment();
  data.Work_Items.push(
    { ...data.Work_Items[0], Work_ID: "W_EARLIER", Due_At: "2020-01-01T00:00:00.000Z" },
    { ...data.Work_Items[0], Work_ID: "W_COMPLETED", Status: "COMPLETED" },
  );
  const result = context.markBadAffiliateFromWork_(owner, {
    workId: "W1",
    affiliateId: "AFF1",
    staffId: "S2",
    assignmentId: "FAKE",
    notes: "Confirmed invalid affiliate",
    requestId: "BAD-WORK-1",
  });
  assert.equal(result.duplicate, false);
  assert.equal(result.replacement.status, "REPLACED");
  assert.equal(data.Contact_Attempts.length, 1);
  assert.equal(data.Contact_Attempts[0].Work_ID, "W1");
  assert.equal(data.Contact_Attempts[0].Affiliate_ID, "AFF1");
  assert.equal(data.Contact_Attempts[0].Assignment_ID, "ASN1");
  assert.equal(data.Contact_Attempts[0].Staff_ID, "S1");
  assert.equal(data.Contact_Attempts[0].Result, "BAD_AFFILIATE");
  assert.equal(data.Interactions.length, 0);
  assert.equal(data.Assignments[0].Status, "ENDED");
  assert.equal(data.Assignments[0].End_Reason, "BAD_AFFILIATE");
  assert.equal(data.Work_Items.find((x) => x.Work_ID === "W1").Status, "CANCELLED");
  assert.equal(data.Work_Items.find((x) => x.Work_ID === "W_EARLIER").Status, "CANCELLED");
  assert.equal(data.Work_Items.find((x) => x.Work_ID === "W_COMPLETED").Status, "COMPLETED");
  assert.equal(data.Followups[0].Status, "COMPLETED");
  assert.equal(data.Followups[0].Outcome, "REPLACEMENT_REQUESTED");
  assert.equal(data.Assignments[1].Staff_ID, "S1");
  assert.equal(data.Work_Items.filter((x) => x.Assignment_ID === data.Assignments[1].Assignment_ID && x.Work_Type === "FIRST_CONTACT").length, 1);
  assert.deepEqual(data.Audit_Log.map((x) => x.action), ["CONTACT_ATTEMPT_RECORDED", "BAD_AFFILIATE_MARKED", "PROSPECT_REPLACED"]);
  const counts = { attempts: data.Contact_Attempts.length, audits: data.Audit_Log.length, assignments: data.Assignments.length, work: data.Work_Items.length, pool: data.Affiliate_Pool.length };
  const replay = context.markBadAffiliateFromWork_(owner, { workId: "W1", affiliateId: "AFF1", notes: "Confirmed invalid affiliate" });
  assert.equal(replay.duplicate, true);
  assert.equal(replay.attemptId, result.attemptId);
  assert.deepEqual({ attempts: data.Contact_Attempts.length, audits: data.Audit_Log.length, assignments: data.Assignments.length, work: data.Work_Items.length, pool: data.Affiliate_Pool.length }, counts);
}
{
  const { context, data } = environment({ pool: false });
  const result = context.markBadAffiliateFromWork_(owner, { workId: "W1", notes: "No valid account" });
  assert.equal(result.replacement.status, "PENDING");
  assert.equal(data.Assignments[0].Status, "ENDED");
  assert.equal(data.Work_Items[0].Status, "CANCELLED");
  assert.ok(data.Audit_Log.some((x) => x.action === "PROSPECT_REPLACEMENT_PENDING"));
  const replay = context.markBadAffiliateFromWork_(owner, { workId: "W1", notes: "No valid account" });
  assert.equal(replay.duplicate, true);
  assert.equal(replay.replacement.status, "PENDING");
  assert.equal(data.Contact_Attempts.length, 1);
}
{
  const { context, data } = environment();
  context.markBadAffiliateFromWork_(owner, { workId: "W1", notes: '=IMPORTXML("bad")' });
  assert.ok(data.Contact_Attempts[0].Notes.startsWith("'="));
}
for (const setup of [
  (data) => { data.Work_Items[0].Status = "COMPLETED"; },
  (data) => { data.Work_Items[0].Status = "CANCELLED"; },
  (data) => { data.Assignments[0].Status = "ENDED"; },
  (data) => { data.Assignments[0].Staff_ID = "S2"; },
  (data) => { data.Work_Items[0].Assignment_ID = "MISMATCH"; },
]) {
  const { context, data } = environment();
  setup(data);
  assert.throws(() => context.markBadAffiliateFromWork_(owner, { workId: "W1", affiliateId: "AFF1", notes: "Invalid" }), (e) => e.code === "INVALID_STATE");
  assert.equal(data.Contact_Attempts.length, 0);
}
{
  const { context, data } = environment();
  assert.throws(() => context.markBadAffiliateFromWork_(owner, { workId: "", notes: "Invalid" }), (e) => e.code === "VALIDATION_FAILED");
  assert.throws(() => context.markBadAffiliateFromWork_(owner, { workId: "MISSING", notes: "Invalid" }), (e) => e.code === "NOT_FOUND");
  assert.throws(() => context.markBadAffiliateFromWork_(owner, { workId: "W1", affiliateId: "OTHER", notes: "Invalid" }), (e) => e.code === "VALIDATION_FAILED");
  assert.throws(() => context.markBadAffiliateFromWork_(owner, { workId: "W1", notes: "" }), (e) => e.code === "VALIDATION_FAILED");
  assert.throws(() => context.markBadAffiliateFromWork_(other, { workId: "W1", notes: "Invalid", staffId: "S1" }), (e) => e.code === "FORBIDDEN");
  assert.throws(() => context.markBadAffiliateFromWork_({ Staff_ID: "ADMIN", Role: "ADMIN" }, { workId: "W1", notes: "Invalid" }), (e) => e.code === "FORBIDDEN");
  assert.equal(data.Contact_Attempts.length, 0);
}
{
  const { context, data } = environment();
  context.submitFirstContactOutcome_(owner, { workId: "W1", outcome: "NO_ANSWER" });
  assert.throws(() => context.markBadAffiliateFromWork_(owner, { workId: "W1", notes: "Invalid" }), (e) => e.code === "INVALID_STATE");
  assert.equal(data.Contact_Attempts.length, 1);
}
{
  const { context, data } = environment();
  context.markBadAffiliateFromWork_(owner, { workId: "W1", notes: "Invalid" });
  assert.throws(() => context.submitFirstContactOutcome_(owner, { workId: "W1", outcome: "NO_ANSWER" }), (e) => e.code === "INVALID_STATE");
  assert.equal(data.Contact_Attempts.length, 1);
}
{
  const { context, data } = environment();
  assert.throws(
    () =>
      context.recordProspectAttempt_(owner, {
        affiliateId: "AFF1",
        channel: "SMS",
        outcome: "NO_ANSWER",
      }),
    (e) => e.code === "VALIDATION_FAILED",
  );
  assert.equal(data.Contact_Attempts.length, 0);
}
const api = fs.readFileSync("backend/Api.gs", "utf8"),
  backend = fs.readFileSync("backend/Replacement.gs", "utf8"),
  client = fs.readFileSync("lib/api-client.ts", "utf8"),
  page = fs.readFileSync("app/affiliates/contact-attempt/page.tsx", "utf8"),
  affiliatePage = fs.readFileSync("app/affiliates/page.tsx", "utf8"),
  affiliateCompact = affiliatePage.replace(/\s/g, ""),
  workspaceCss = fs.readFileSync("app/affiliates/workspace.module.css", "utf8");
assert.match(
  api,
  /sessionUser_\(request\.token\).*getProspectContactWorkspace/s,
);
assert.match(
  page,
  /staffId:'IGNORED'.*assignmentId:'IGNORED'.*attemptNumber:999/,
);
assert.match(page, /Telegram connection status/);
assert.match(page, /value="TELEGRAM_NOT_CONNECTED">Not connected yet/);
assert.match(page, /value="TELEGRAM_CONNECTED">Connected/);
assert.match(page, /Telegram username/);
assert.match(page, /telegramStatus:outcome==='CONNECTED'\?telegramStatus:''/);
assert.match(page, /telegramUsername:outcome==='CONNECTED'&&telegramStatus==='TELEGRAM_CONNECTED'\?telegramUsername:''/);
assert.match(
  page,
  /OUTCOMES\.map\(x=><option value=\{x\.value\} key=\{x\.value\}>\{x\.label\}<\/option>\)/,
);
assert.match(
  page,
  /CHANNELS\.map\(x=><option value=\{x\.value\} key=\{x\.value\}>\{x\.label\}<\/option>\)/,
);
for (const value of [
  "CONNECTED",
  "NO_ANSWER",
  "UNREACHABLE",
  "WRONG_CONTACT",
  "CALLBACK_REQUESTED",
  "BAD_AFFILIATE",
  "OTHER",
]) {
  assert.match(page, new RegExp(`value:'${value}'`));
  assert.match(backend, new RegExp(`['\"]${value}['\"]`));
}
assert.match(
  affiliateCompact,
  /className=\{styles\.contactPrimary\}[^>]+>RecordContactAttempt<\/Link>/,
);
assert.match(
  affiliateCompact,
  /className=\{styles\.contactSecondary\}[^>]+>ReportIssue<\/Link>/,
);
assert.match(workspaceCss, /\.contactPrimary:hover/);
assert.match(workspaceCss, /\.contactPrimary:focus-visible/);
assert.match(api, /markBadAffiliateFromWork:function\(\)\{return markBadAffiliateFromWork_\(u,p\)\}/);
assert.match(client, /markBadAffiliateFromWork\(payload:[^]*this\.call<ProspectAttemptResult>\('markBadAffiliateFromWork',payload\)/);
assert.match(affiliatePage, /Mark as Bad Affiliate/);
assert.match(affiliatePage, /Confirm Bad Affiliate/);
assert.match(affiliatePage, /workId,\s*affiliateId: workspace\.work\.affiliateId/);
assert.match(affiliatePage, /submitFirstContactOutcome\(payload\)/);
assert.ok(!affiliatePage.includes('window.confirm'));
assert.match(workspaceCss, /\.badAffiliate/);
assert.ok(!backend.match(/Password_Hash|Session_Token_Hash/));
console.log("replacement workflow tests passed");
