// Shared helpers for influencer (partner) coupons and commissions.
// Files starting with "_" inside /api are NOT public endpoints on Vercel.
//
// How it works
//  • The owner gives each approved partner a coupon code (e.g. RAHUL10) from
//    partner.html → Admin. It is stored in Firestore: coupons/{CODE} = { partnerUid, active }.
//  • /api/create-order looks the code up SERVER-SIDE, takes 10% off and writes the
//    partner's uid into the Razorpay order "notes" (the browser cannot change these).
//  • After Razorpay confirms the payment (/api/verify-payment, and the webhook as a
//    backup), recordCommission() re-reads the ORDER from Razorpay and writes
//    commissions/{paymentId}: 20% of the amount the student actually paid.
//    The doc id is the payment id, so one payment can never create two commissions.

var STUDENT_DISCOUNT = 0.10;   // student gets 10% off
var PARTNER_RATE     = 0.20;   // partner earns 20% of what the student paid
var CODE_RE = /^[A-Z0-9]{4,15}$/;

var PLAN_NAME = {
  grade11: "11th Grade Prep",
  grade12: "12th Grade Intensive",
  dropper: "Dropper Focused",
  crash27: "JEE Main Jan 2027 Crash Course"
};

function cleanCode(c) { return (c || "").toString().trim().toUpperCase(); }

// Price after the partner discount, rounded to whole rupees (in paise).
function discounted(amountPaise) {
  return Math.round(amountPaise * (1 - STUDENT_DISCOUNT) / 100) * 100;
}

// Commission in whole rupees on the amount actually paid (paise in, rupees out).
function commissionRupees(paidPaise) {
  return Math.round((paidPaise / 100) * PARTNER_RATE);
}

function monthKey(ts) {
  // Month in Indian time so a sale at 11 PM IST on the 31st counts in that month.
  var d = new Date(ts + 5.5 * 3600 * 1000);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

// Looks up a partner coupon. Returns { partnerUid, partnerName, code } or null.
async function findPartnerCoupon(db, code) {
  code = cleanCode(code);
  if (!CODE_RE.test(code)) return null;
  var snap = await db.collection("coupons").doc(code).get();
  var c;
  if (snap.exists) {
    c = snap.data() || {};
  } else {
    // Older auto-generated partner codes (DAKxxxxxxx) keep working.
    var old = await db.collection("refcodes").doc(code).get();
    if (!old.exists) return null;
    c = { partnerUid: (old.data() || {}).uid };
  }
  if (c.active === false || !c.partnerUid) return null;
  var p = await db.collection("partners").doc(c.partnerUid).get();
  if (!p.exists || (p.data() || {}).status !== "approved") return null;
  return { partnerUid: c.partnerUid, partnerName: c.partnerName || (p.data() || {}).fullName || "", code: code };
}

// Reads an order from Razorpay with the secret key (trusted source of notes + amount).
async function fetchOrder(orderId) {
  var auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
  var r = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(orderId), {
    headers: { "Authorization": "Basic " + auth }
  });
  if (!r.ok) throw new Error("Could not read order " + orderId);
  return r.json();
}

// Writes the commission for a verified payment. Safe to call many times for the
// same payment (verify-payment + webhook): only the first call creates the doc.
// Returns "created", "exists", or a reason string when no commission is due.
async function recordCommission(admin, opts) {
  var order = opts.order || await fetchOrder(opts.orderId);
  var n = order.notes || {};
  var partnerUid = (n.partnerUid || "").toString();
  if (!partnerUid) return "no-partner";
  var studentUid = (opts.studentUid || n.uid || "").toString();
  if (studentUid && studentUid === partnerUid) return "self-purchase";
  var paid = +(order.amount_paid || 0) || +(order.amount || 0);
  if (!(paid > 0)) return "not-paid";

  var now = Date.now();
  var plan = (n.plan || "").toString();
  var doc = {
    partnerUid: partnerUid,
    refCode: (n.coupon || "").toString(),
    studentUid: studentUid,
    studentName: ((n.name || "").toString().split(" ")[0] || "").slice(0, 40), // first name only
    plan: plan,
    planName: PLAN_NAME[plan] || plan,
    listAmount: Math.round((+n.list_amount || 0) / 100),
    amount: Math.round(paid / 100),          // rupees the student paid
    commission: commissionRupees(paid),      // rupees due to the partner
    status: "due",                           // due → paid (or cancelled on refund)
    orderId: order.id || opts.orderId || "",
    paymentId: opts.paymentId,
    source: opts.source || "verify",
    ts: now,
    month: monthKey(now)
  };
  try {
    await admin.firestore().collection("commissions").doc(opts.paymentId).create(doc);
    return "created";
  } catch (e) {
    // ALREADY_EXISTS (gRPC code 6) → the other path already recorded it.
    if (e && (e.code === 6 || /already exists/i.test(e.message || ""))) return "exists";
    throw e;
  }
}

// On a refund, a commission that is still unpaid is cancelled automatically.
async function cancelCommission(admin, paymentId, reason) {
  var ref = admin.firestore().collection("commissions").doc(paymentId);
  var snap = await ref.get();
  if (!snap.exists) return "none";
  var d = snap.data() || {};
  if (d.status === "paid") {
    // Already paid out — flag it so the owner can adjust the next payout.
    await ref.set({ refundedAfterPayout: true, refundNote: reason || "refunded" }, { merge: true });
    return "flagged";
  }
  await ref.set({ status: "cancelled", cancelledAt: Date.now(), cancelReason: reason || "refunded" }, { merge: true });
  return "cancelled";
}

module.exports = {
  STUDENT_DISCOUNT: STUDENT_DISCOUNT,
  PARTNER_RATE: PARTNER_RATE,
  CODE_RE: CODE_RE,
  cleanCode: cleanCode,
  discounted: discounted,
  commissionRupees: commissionRupees,
  monthKey: monthKey,
  findPartnerCoupon: findPartnerCoupon,
  fetchOrder: fetchOrder,
  recordCommission: recordCommission,
  cancelCommission: cancelCommission
};
