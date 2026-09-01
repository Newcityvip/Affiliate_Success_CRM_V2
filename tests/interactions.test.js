const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const owner = "STF1",
  other = "STF2",
  now = Date.now();
const data = {
  Assignments: [
    {
      Assignment_ID: "ASN1",
      Affiliate_ID: "AFF1",
      Staff_ID: owner,
      Brand_ID: "BRD1",
      Status: "ACTIVE",
    },
    {
      Assignment_ID: "ASN2",
      Affiliate_ID: "AFF2",
      Staff_ID: other,
      Brand_ID: "BRD1",
      Status: "ACTIVE",
    },
    {
      Assignment_ID: "OLD",
      Affiliate_ID: "AFF3",
      Staff_ID: owner,
      Brand_ID: "BRD1",
      Status: "ENDED",
    },
  ],
  Affiliates: [
    {
      Affiliate_ID: "AFF1",
      Affiliate_Username: "owner.one",
      Affiliate_Name: "Owner One",
      Brand_ID: "BRD1",
    },
    {
      Affiliate_ID: "AFF2",
      Affiliate_Username: "other.two",
      Affiliate_Name: "Other Two",
      Brand_ID: "BRD1",
    },
    {
      Affiliate_ID: "AFF3",
      Affiliate_Username: "inactive.three",
      Brand_ID: "BRD1",
    },
  ],
  Brand_List: [{ Brand_ID: "BRD1", Brand_Name: "Alpha", Brand_Code: "ALPHA" }],
  Staff_List: [
    { Staff_ID: owner, Display_Name: "Owner Staff" },
    { Staff_ID: other, Display_Name: "Other Staff" },
  ],
  Interactions: [
    {
      Interaction_ID: "INT1",
      Affiliate_ID: "AFF1",
      Assignment_ID: "ASN1",
      Staff_ID: owner,
      Work_ID: "WORK1",
      Channel: "CALL",
      Interaction_Type: "FIRST_CONTACT",
      Outcome: "CONNECTED",
      Notes: "Meaningful",
      Interaction_At: new Date(now - 1000).toISOString(),
      Followup_Required: false,
    },
    {
      Interaction_ID: "INT2",
      Affiliate_ID: "AFF2",
      Assignment_ID: "ASN2",
      Staff_ID: other,
      Work_ID: "WORK3",
      Channel: "TELEGRAM",
      Interaction_Type: "CALLBACK",
      Outcome: "CONNECTED",
      Interaction_At: new Date(now - 500).toISOString(),
      Followup_Required: true,
    },
    {
      Interaction_ID: "ORPHAN",
      Affiliate_ID: "MISSING",
      Assignment_ID: "MISSING",
      Staff_ID: owner,
      Interaction_At: new Date(now).toISOString(),
    },
  ],
  Contact_Attempts: [
    {
      Attempt_ID: "ATM1",
      Affiliate_ID: "AFF1",
      Assignment_ID: "ASN1",
      Staff_ID: owner,
      Work_ID: "WORK1",
      Channel: "CALL",
      Result: "CONNECTED",
      Attempt_At: new Date(now - 1000).toISOString(),
    },
    {
      Attempt_ID: "ATM2",
      Affiliate_ID: "AFF1",
      Assignment_ID: "ASN1",
      Staff_ID: owner,
      Work_ID: "WORK2",
      Channel: "CALL",
      Result: "NO_ANSWER",
      Attempt_At: new Date(now).toISOString(),
      Callback_Required: false,
    },
    {
      Attempt_ID: "ATM3",
      Affiliate_ID: "AFF3",
      Assignment_ID: "OLD",
      Staff_ID: owner,
      Work_ID: "WORK4",
      Attempt_At: new Date(now).toISOString(),
    },
  ],
};
const context = {
  console,
  Date,
  String,
  Number,
  Math,
  Boolean,
  rows_: (name) => data[name] || [],
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("backend/Interactions.gs", "utf8"), context);
const result = context.myInteractions_(
  { Staff_ID: owner, Role: "STAFF" },
  { staffId: other, pageSize: 500 },
);
assert.equal(result.total, 2);
assert.deepEqual(
  Array.from(result.items, (x) => x.id),
  ["ATM2", "INT1"],
);
assert.ok(result.items.every((x) => x.affiliateId === "AFF1"));
assert.equal(result.items[0].affiliateUsername, "owner.one");
assert.equal(result.items[0].brandName, "Alpha");
assert.equal(result.items[0].staffName, "Owner Staff");
assert.ok(
  !result.items.some(
    (x) => x.id === "ATM1" || x.id === "ORPHAN" || x.id === "ATM3",
  ),
);
assert.ok(!JSON.stringify(result).match(/Password|Session|Token_Hash/i));
const admin = context.myInteractions_(
  { Staff_ID: "ADMIN", Role: "SUPER_ADMIN" },
  { pageSize: 500 },
);
assert.equal(admin.total, 3);
assert.ok(admin.items.some((x) => x.id === "INT2"));
assert.ok(!admin.items.some((x) => x.id === "ORPHAN" || x.id === "ATM3"));
const ui = fs.readFileSync("app/interactions/page.tsx", "utf8");
assert.match(ui, /api\.getMyInteractions\(/);
assert.match(ui, /readCache<InteractionsResponse>/);
assert.match(ui, /clearReadCache\(\);setData\(null\)/);
assert.match(ui, /aria-pressed=\{filter===key\}/);
assert.match(ui, /View Affiliate/);
assert.match(ui, /Pagination/);
assert.match(ui, /matching interaction/);
console.log(
  "Interaction history enrichment, deduplication, ordering, scoping, and UI scenarios passed",
);
