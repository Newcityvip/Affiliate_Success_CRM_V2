function openFollowup_(status) {
  return ["PENDING", "IN_PROGRESS", "OVERDUE"].indexOf(String(status)) >= 0;
}
var MONTHLY_ROUTINE_FOLLOWUP_TYPE_ = "MONTHLY_ROUTINE_CALL";
function nextCalendarMonth_(value) {
  var date = new Date(value),
    day = date.getUTCDate(),
    next = new Date(date.getTime());
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  var lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next.toISOString();
}
function ensureMonthlyRoutineFollowup_(user, context, interactionId, workId, connectedAt, dueOverride) {
  var affiliateId = String(context.affiliate.Affiliate_ID),
    assignmentId = String(context.assignment.Assignment_ID),
    staffId = String(user.Staff_ID),
    existing = rows_("Followups").filter(function (f) {
      return (
        String(f.Affiliate_ID) === affiliateId &&
        String(f.Assignment_ID) === assignmentId &&
        String(f.Staff_ID) === staffId &&
        String(f.Followup_Type) === MONTHLY_ROUTINE_FOLLOWUP_TYPE_ &&
        openFollowup_(f.Status)
      );
    })[0];
  if (existing) {
    if (dueOverride) updateById_("Followups", "Followup_ID", existing.Followup_ID, {
      Due_At: dueOverride,
      Reminder_At: dueOverride,
      Updated_At: connectedAt,
    });
    return existing.Followup_ID;
  }
  var id = reserveIdsUnlocked_("Followup", 1)[0],
    due = dueOverride || nextCalendarMonth_(connectedAt);
  appendRows_("Followups", [{
    Followup_ID: id,
    Affiliate_ID: affiliateId,
    Assignment_ID: assignmentId,
    Staff_ID: staffId,
    Source_Interaction_ID: interactionId || "",
    Source_Work_ID: workId || "",
    Followup_Type: MONTHLY_ROUTINE_FOLLOWUP_TYPE_,
    Priority: "NORMAL",
    Status: "PENDING",
    Due_At: due,
    Reminder_At: due,
    Completed_At: "",
    Outcome: "",
    Notes: "Routine monthly call after Telegram connection.",
    Created_At: connectedAt,
    Updated_At: connectedAt,
    Created_By: staffId,
  }]);
  return id;
}
function completeMonthlyRoutineFollowup_(user, p) {
  var due = String(p.nextFollowupAt || ""), dueMs = new Date(due).getTime(), notes = String(p.notes || "").trim().slice(0, 1000);
  if (/^[=+\-@]/.test(notes)) notes = "'" + notes;
  if (!due || !isFinite(dueMs) || dueMs <= Date.now())
    throw apiError_("VALIDATION_FAILED", "Choose a future follow-up date and time.");
  due = new Date(dueMs).toISOString();
  var lock = LockService.getScriptLock(), result, t = now_();
  lock.waitLock(30000);
  try {
    ["Followups", "Assignments", "Affiliates"].forEach(clearCache_);
    var followup = rows_("Followups").filter(function (f) {
        return String(f.Followup_ID) === String(p.followupId);
      })[0];
    if (!followup) throw apiError_("NOT_FOUND", "Follow-up not found.");
    if (String(followup.Staff_ID) !== String(user.Staff_ID))
      throw apiError_("FORBIDDEN", "Access denied.");
    if (String(followup.Followup_Type) !== MONTHLY_ROUTINE_FOLLOWUP_TYPE_ || !openFollowup_(followup.Status))
      throw apiError_("INVALID_STATE", "This routine follow-up is no longer active.");
    var assignment = rows_("Assignments").filter(function (a) {
        return String(a.Assignment_ID) === String(followup.Assignment_ID) &&
          String(a.Affiliate_ID) === String(followup.Affiliate_ID) &&
          String(a.Staff_ID) === String(user.Staff_ID) && a.Status === "ACTIVE";
      })[0], affiliate = rows_("Affiliates").filter(function (a) {
        return String(a.Affiliate_ID) === String(followup.Affiliate_ID);
      })[0];
    if (!assignment) throw apiError_("INVALID_STATE", "This follow-up no longer has an active assignment.");
    if (!affiliate || String(affiliate.Telegram_Status) !== "CONNECTED")
      throw apiError_("INVALID_STATE", "Telegram must remain connected for a routine follow-up.");
    var successor = rows_("Followups").filter(function (f) {
        return String(f.Followup_ID) !== String(followup.Followup_ID) &&
          String(f.Affiliate_ID) === String(followup.Affiliate_ID) &&
          String(f.Assignment_ID) === String(followup.Assignment_ID) &&
          String(f.Staff_ID) === String(user.Staff_ID) &&
          String(f.Followup_Type) === MONTHLY_ROUTINE_FOLLOWUP_TYPE_ && openFollowup_(f.Status);
      })[0], successorId;
    if (successor) {
      successorId = successor.Followup_ID;
      updateById_("Followups", "Followup_ID", successorId, {Due_At: due, Reminder_At: due, Updated_At: t});
    } else {
      successorId = reserveIdsUnlocked_("Followup", 1)[0];
      appendRows_("Followups", [{Followup_ID:successorId,Affiliate_ID:followup.Affiliate_ID,Assignment_ID:followup.Assignment_ID,Staff_ID:user.Staff_ID,Source_Interaction_ID:followup.Source_Interaction_ID||"",Source_Work_ID:followup.Source_Work_ID||"",Followup_Type:MONTHLY_ROUTINE_FOLLOWUP_TYPE_,Priority:followup.Priority||"NORMAL",Status:"PENDING",Due_At:due,Reminder_At:due,Completed_At:"",Outcome:"",Notes:"Routine monthly call after Telegram connection.",Created_At:t,Updated_At:t,Created_By:user.Staff_ID}]);
    }
    updateById_("Followups", "Followup_ID", followup.Followup_ID, {Status:"COMPLETED",Completed_At:t,Outcome:"ROUTINE_CONTACT_COMPLETED",Notes:notes||followup.Notes||"",Updated_At:t});
    result = {followupId:followup.Followup_ID,successorFollowupId:successorId,affiliateId:followup.Affiliate_ID,assignmentId:followup.Assignment_ID,dueAt:due,completedAt:t};
  } finally { lock.releaseLock(); }
  audit_(user,"MONTHLY_ROUTINE_FOLLOWUP_COMPLETED","Followup",result.followupId,result.affiliateId,null,{Followup_ID:result.followupId,Successor_Followup_ID:result.successorFollowupId,Affiliate_ID:result.affiliateId,Assignment_ID:result.assignmentId,Staff_ID:user.Staff_ID,Next_Followup_At:result.dueAt},{requestId:p.requestId});
  return result;
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
  var query = String(p.search || "")
    .trim()
    .toLowerCase();
  if (query)
    candidates = candidates.filter(function (x) {
      var brand = brandById[
        String(x.assignment.Brand_ID || x.affiliate.Brand_ID)
      ] || {};
      return [
        x.affiliate.Affiliate_Username,
        x.affiliate.Affiliate_Name,
        x.affiliate.Email,
        x.affiliate.Phone,
        brand.Brand_Name,
        brand.Brand_Code,
      ].some(function (value) {
        return String(value || "").toLowerCase().indexOf(query) >= 0;
      });
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
