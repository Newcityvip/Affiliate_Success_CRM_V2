const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const owner = "S1";
const data = {
  Staff_List: [
    { Staff_ID: owner, Display_Name: "Owner", Role: "STAFF" },
    { Staff_ID: "S2", Display_Name: "Other", Role: "STAFF" },
  ],
  Brand_List: [{ Brand_ID: "B1", Brand_Name: "Brand One" }],
  Affiliates: [
    { Affiliate_ID: "A0", Affiliate_Username: "zero", Brand_ID: "B1", Prospect_Status: "NEW", Telegram_Status: "NOT_CONNECTED" },
    { Affiliate_ID: "A1", Affiliate_Username: "john.three", Brand_ID: "B1", Prospect_Status: "ACTIVE", Telegram_Status: "NOT_CONNECTED", Telegram_Username: "@present_does_not_mean_connected" },
    { Affiliate_ID: "A2", Affiliate_Username: "connected.one", Brand_ID: "B1", Prospect_Status: "ACTIVE", Telegram_Status: "CONNECTED" },
    { Affiliate_ID: "A3", Affiliate_Username: "two", Brand_ID: "B1", Prospect_Status: "ACTIVE", Telegram_Status: "NOT_CONNECTED" },
    { Affiliate_ID: "A4", Affiliate_Username: "other.staff", Brand_ID: "B1", Prospect_Status: "ACTIVE", Telegram_Status: "NOT_CONNECTED" },
  ],
  Assignments: [
    { Assignment_ID: "AS0", Affiliate_ID: "A0", Staff_ID: owner, Brand_ID: "B1", Status: "ACTIVE" },
    { Assignment_ID: "AS1", Affiliate_ID: "A1", Staff_ID: owner, Brand_ID: "B1", Status: "ACTIVE" },
    { Assignment_ID: "AS2", Affiliate_ID: "A2", Staff_ID: owner, Brand_ID: "B1", Status: "ACTIVE" },
    { Assignment_ID: "AS3", Affiliate_ID: "A3", Staff_ID: owner, Brand_ID: "B1", Status: "ACTIVE" },
    { Assignment_ID: "OLD3", Affiliate_ID: "A3", Staff_ID: owner, Brand_ID: "B1", Status: "ENDED" },
    { Assignment_ID: "AS4", Affiliate_ID: "A4", Staff_ID: "S2", Brand_ID: "B1", Status: "ACTIVE" },
  ],
  Work_Items: [],
  Contact_Attempts: [
    { Attempt_ID: "A1-1", Assignment_ID: "AS1", Result: "NO_ANSWER", Attempt_At: "2026-01-01T00:00:00Z" },
    { Attempt_ID: "A1-2", Assignment_ID: "AS1", Result: "UNREACHABLE", Attempt_At: "2026-01-04T00:00:00Z" },
    { Attempt_ID: "A1-3", Assignment_ID: "AS1", Result: "OTHER", Attempt_At: "2026-01-09T00:00:00Z" },
    { Attempt_ID: "A2-1", Assignment_ID: "AS2", Result: "WRONG_CONTACT", Attempt_At: "2026-01-01T00:00:00Z" },
    { Attempt_ID: "A3-1", Assignment_ID: "AS3", Result: "NO_ANSWER", Attempt_At: "2026-01-01T00:00:00Z" },
    { Attempt_ID: "A3-N", Assignment_ID: "AS3", Result: "CONNECTED", Attempt_At: "2026-01-02T00:00:00Z" },
    { Attempt_ID: "A3-E", Assignment_ID: "AS3", Result: "UNREACHABLE", Attempt_At: "2026-01-02T01:00:00Z" },
    { Attempt_ID: "A3-2", Assignment_ID: "AS3", Result: "NUMBER_OFF", Attempt_At: "2026-01-04T00:00:00Z" },
    { Attempt_ID: "OLD", Assignment_ID: "OLD3", Result: "NO_ANSWER", Attempt_At: "2025-01-01T00:00:00Z" },
  ],
};
const reads = {};
const context = {
  console, Date, String, Number, Math, Object, Array, isFinite,
  rows_: (name) => { reads[name] = (reads[name] || 0) + 1; return data[name] || []; },
  config_: (key) => key === "ATTEMPT_TWO_WAIT_HOURS" ? 72 : key === "ATTEMPT_THREE_WAIT_HOURS" ? 120 : 24,
  requireRole_: (user, roles) => { if (!roles.includes(user.Role)) throw context.apiError_("FORBIDDEN", "Denied"); },
  apiError_: (code, message) => Object.assign(new Error(message), { code }),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("backend/Replacement.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("backend/Directory.gs", "utf8"), context);

const staff = { Staff_ID: owner, Role: "STAFF" };
const directory = context.affiliateDirectory_(staff, { page: 1, pageSize: 50 });
assert.deepEqual(Object.fromEntries(directory.items.map((item) => [item.affiliateId, item.qualifyingAttemptCount])), { A0: 0, A1: 3, A2: 1, A3: 2 });
assert.equal(directory.summary.telegramConnected, 1);
assert.equal(directory.summary.telegramNotConnected, 3);
assert.equal(reads.Contact_Attempts, 1, "directory must bulk-read Contact_Attempts once");
assert.ok(!directory.items.some((item) => item.affiliateId === "A4"), "cross-staff affiliate must remain hidden");

const workspace = context.prospectWorkspace_(staff, { affiliateId: "A3" });
assert.equal(workspace.replacementAttemptCount, directory.items.find((item) => item.affiliateId === "A3").qualifyingAttemptCount);

const filtered = context.affiliateDirectory_(staff, { filter: "telegram-not-connected", search: "john", page: 1, pageSize: 1 });
assert.equal(filtered.total, 1);
assert.equal(filtered.items[0].affiliateId, "A1");
assert.equal(filtered.pageSize, 1);
const pageTwo = context.affiliateDirectory_(staff, { filter: "telegram-not-connected", page: 2, pageSize: 1 });
assert.equal(pageTwo.total, 3);
assert.equal(pageTwo.items.length, 1);
assert.ok(pageTwo.items[0].telegramStatus !== "CONNECTED");

const source = fs.readFileSync("app/affiliates/page.tsx", "utf8");
assert.match(source, /Telegram Not Connected/);
assert.match(source, /qualifyingAttemptCount\}\/3/);
assert.match(source, /recordProspectContactAttempt\(\{[\s\S]*outcome: "BAD_AFFILIATE"/);
assert.match(source, /badAffiliateNotes/);
assert.match(source, /data\.canMarkBadAffiliate/);
console.log("Affiliate attempts, Telegram-not-connected filter, and Affiliate 360 control tests passed");
