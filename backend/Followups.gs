function openFollowup_(status) {
  return ["PENDING", "IN_PROGRESS", "OVERDUE"].indexOf(String(status)) >= 0;
}
function followupAdmin_(user) {
  return ["ADMIN", "SUPER_ADMIN"].indexOf(user.Role) >= 0;
}
function followupState_(row, now, todayKey) {
  var due = String(row.Due_At || ""),
    dueMs = due ? new Date(due).getTime() : NaN,
    dueDate = isFinite(dueMs) ? new Date(dueMs) : null,
    dueToday =
      Boolean(dueDate) &&
      [dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()].join(
        "-",
      ) === todayKey,
    open = openFollowup_(row.Status);
  return {
    due: due,
    dueMs: isFinite(dueMs) ? dueMs : Infinity,
    open: open,
    overdue: open && isFinite(dueMs) && dueMs < now,
    dueToday: dueToday && open,
    upcoming: open && isFinite(dueMs) && dueMs > now && !dueToday,
  };
}
function followupSafe_(candidate, maps) {
  var f = candidate.row,
    assignment = candidate.assignment,
    affiliate = candidate.affiliate,
    source = maps.workById[String(f.Source_Work_ID)] || {},
    linked =
      (source.Work_Type === "CALLBACK" && openFollowup_(source.Status)
        ? source
        : maps.activeCallbackByParent[String(f.Source_Work_ID)]) || {},
    brand =
      maps.brandById[String(assignment.Brand_ID || affiliate.Brand_ID)] || {},
    state = candidate.state;
  return {
    followupId: f.Followup_ID,
    affiliateId: f.Affiliate_ID,
    assignmentId: f.Assignment_ID,
    staffId: f.Staff_ID,
    affiliateUsername: affiliate.Affiliate_Username,
    affiliateName: affiliate.Affiliate_Name || "",
    brandId: brand.Brand_ID || affiliate.Brand_ID || "",
    brandName: brand.Brand_Name || "",
    brandCode: brand.Brand_Code || "",
    followupType: f.Followup_Type || "",
    channel: linked.Work_Channel || source.Work_Channel || "",
    status: f.Status || "",
    dueAt: state.due,
    priority: f.Priority || linked.Priority || "",
    title: linked.Title || source.Title || "",
    reason: linked.Reason || source.Reason || "",
    notes: f.Notes || "",
    sourceWorkId: f.Source_Work_ID || "",
    linkedWorkId: linked.Work_ID || "",
    email: affiliate.Email || "",
    phone: affiliate.Phone || "",
    telegramUsername: affiliate.Telegram_Username || "",
    telegramStatus: affiliate.Telegram_Status || "",
    overdue: state.overdue,
    dueToday: state.dueToday,
    upcoming: state.upcoming,
  };
}
function myFollowups_(user, p) {
  p = p || {};
  var admin = followupAdmin_(user),
    staffId = String(user.Staff_ID),
    assignments = rows_("Assignments"),
    affiliates = rows_("Affiliates"),
    brands = rows_("Brand_List"),
    staffRows = rows_("Staff_List"),
    works = rows_("Work_Items"),
    assignmentById = {},
    affiliateById = {},
    brandById = {},
    staffById = {},
    workById = {},
    activeCallbackByParent = {},
    now = Date.now(),
    today = new Date(now),
    todayKey = [today.getFullYear(), today.getMonth(), today.getDate()].join(
      "-",
    );
  assignments.forEach(function (a) {
    assignmentById[String(a.Assignment_ID)] = a;
  });
  affiliates.forEach(function (a) {
    affiliateById[String(a.Affiliate_ID)] = a;
  });
  brands.forEach(function (b) {
    brandById[String(b.Brand_ID)] = b;
  });
  staffRows.forEach(function (s) {
    staffById[String(s.Staff_ID)] = s;
  });
  works.forEach(function (w) {
    workById[String(w.Work_ID)] = w;
    if (
      w.Work_Type === "CALLBACK" &&
      openFollowup_(w.Status) &&
      !activeCallbackByParent[String(w.Parent_Work_ID)]
    )
      activeCallbackByParent[String(w.Parent_Work_ID)] = w;
  });
  var candidates = rows_("Followups")
      .filter(function (f) {
        if (!admin && String(f.Staff_ID) !== staffId) return false;
        var assignment = assignmentById[String(f.Assignment_ID)],
          affiliate = affiliateById[String(f.Affiliate_ID)];
        if (
          !assignment ||
          assignment.Status !== "ACTIVE" ||
          String(assignment.Affiliate_ID) !== String(f.Affiliate_ID) ||
          (!admin && String(assignment.Staff_ID) !== staffId) ||
          !affiliate
        )
          return false;
        if (
          admin &&
          p.staffId &&
          String(assignment.Staff_ID) !== String(p.staffId)
        )
          return false;
        var owner = staffById[String(assignment.Staff_ID)] || {},
          brandId = String(assignment.Brand_ID || affiliate.Brand_ID || "");
        if (admin && p.teamId && String(owner.Team) !== String(p.teamId))
          return false;
        if (admin && p.brandId && brandId !== String(p.brandId)) return false;
        return true;
      })
      .map(function (f) {
        return {
          row: f,
          assignment: assignmentById[String(f.Assignment_ID)],
          affiliate: affiliateById[String(f.Affiliate_ID)],
          state: followupState_(f, now, todayKey),
        };
      }),
    summary = { open: 0, overdue: 0, dueToday: 0, upcoming: 0 };
  candidates.forEach(function (x) {
    if (x.state.open) summary.open++;
    if (x.state.overdue) summary.overdue++;
    if (x.state.dueToday) summary.dueToday++;
    if (x.state.upcoming) summary.upcoming++;
  });
  var filter = String(p.filter || "");
  if (filter === "open")
    candidates = candidates.filter(function (x) {
      return x.state.open;
    });
  else if (filter === "overdue")
    candidates = candidates.filter(function (x) {
      return x.state.overdue;
    });
  else if (filter === "today")
    candidates = candidates.filter(function (x) {
      return x.state.dueToday;
    });
  else if (filter === "upcoming")
    candidates = candidates.filter(function (x) {
      return x.state.upcoming;
    });
  candidates.sort(function (a, b) {
    function group(x) {
      return x.state.overdue
        ? 0
        : x.state.dueToday
          ? 1
          : x.state.upcoming
            ? 2
            : 3;
    }
    return (
      group(a) - group(b) ||
      a.state.dueMs - b.state.dueMs ||
      String(a.row.Followup_ID).localeCompare(String(b.row.Followup_ID))
    );
  });
  var size = Math.max(1, Math.min(Number(p.pageSize) || 50, 100)),
    page = Math.max(1, Number(p.page) || 1),
    start = (page - 1) * size,
    maps = {
      brandById: brandById,
      workById: workById,
      activeCallbackByParent: activeCallbackByParent,
    },
    items = candidates.slice(start, start + size).map(function (x) {
      return followupSafe_(x, maps);
    });
  return {
    items: items,
    page: page,
    pageSize: size,
    total: candidates.length,
    hasMore: start + items.length < candidates.length,
    summary: summary,
  };
}
