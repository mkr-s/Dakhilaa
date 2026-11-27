// Razorpay webhook — a safety net that runs even if the student closes the tab
// right after paying (so /api/verify-payment never got called).
//
// Set it up once in Razorpay Dashboard → Settings → Webhooks:
//   URL:    https://www.dakhilaa.com/api/razorpay-webhook
//   Events: payment.captured, refund.processed
//   Secret: any password; put the same value in Vercel env RAZORPAY_WEBHOOK_SECRET
//
// Security: we never trust the webhook body by itself. For every event we read the
// payment and the order back from Razorpay with our secret API key, and act only
// on what Razorpay itself returns. A faked webhook therefore cannot unlock a course
// or create a commission.
var crypto = require("crypto");
var _fb = require("./_firebase");
var _cm = require("./_commission");

var PLAN_NAME = {
  grade11: "11th Grade Prep",
  grade12: "12th Grade Intensive",
  dropper: "Dropper Focused"
};

function rzGet(path) {
  var auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
  return fetch("https://api.razorpay.com/v1/" + path, { headers: { "Authorization": "Basic " + auth } })
    .then(function (r) { if (!r.ok) throw new Error("Razorpay " + r.status); return r.json(); });
}

function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body || {});
}

// Unlocks what the student paid for, only if it is not already unlocked.
async function activate(admin, uid, plan, paymentId) {
  if (!uid || !plan) return "no-user";
  var ref = admin.firestore().collection("users").doc(uid);
  var snap = await ref.get();
  var u = snap.exists ? (snap.data() || {}) : {};
  if (plan === "crash27") {
    if (u.crash27 === true) return "already";
    await ref.set({ crash27: true, crash27Since: Date.now(), crash27PaymentId: paymentId }, { merge: true });
    return "activated";
  }
  if (PLAN_NAME[plan]) {
    if (u.plan === plan) return "already";
    await ref.set({ plan: plan, planName: PLAN_NAME[plan], planSince: Date.now(), lastPaymentId: paymentId, planSource: "payment" }, { merge: true });
    return "activated";
  }
  return "unknown-plan";
}

module.exports = async function (req, res) {
  if (req.method !== "POST") { res.status(200).json({ ok: true, info: "Razorpay webhook endpoint" }); return; }
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) { res.status(500).json({ ok: false }); return; }

  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (Buffer.isBuffer(body)) { try { body = JSON.parse(body.toString("utf8")); } catch (e) { body = {}; } }
  body = body || {};

  // Signature check (extra layer; the real protection is the read-back below).
  var secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  var sig = req.headers["x-razorpay-signature"] || "";
  if (secret && sig) {
    var expected = crypto.createHmac("sha256", secret).update(rawBody(req)).digest("hex");
    if (expected !== sig) console.warn("webhook: signature mismatch (continuing with Razorpay read-back)");
  }

  var event = body.event || "";
  var payload = body.payload || {};
  try {
    var admin = _fb.getAdmin();

    if (event === "payment.captured") {
      var pid = payload.payment && payload.payment.entity && payload.payment.entity.id;
      if (!pid) { res.status(200).json({ ok: true, skipped: "no payment id" }); return; }
      var pay = await rzGet("payments/" + encodeURIComponent(pid));
      if (pay.status !== "captured" || !pay.order_id) { res.status(200).json({ ok: true, skipped: "not captured" }); return; }
      var order = await rzGet("orders/" + encodeURIComponent(pay.order_id));
      var n = order.notes || {};
      var act = n.coupon === "TEST1" ? "test" : await activate(admin, (n.uid || "").toString(), (n.plan || "").toString(), pid);
      var cm = await _cm.recordCommission(admin, { order: order, orderId: order.id, paymentId: pid, studentUid: n.uid || "", source: "webhook" });
      res.status(200).json({ ok: true, activation: act, commission: cm });
      return;
    }

    if (event === "refund.processed" || event === "refund.created" || event === "payment.refunded") {
      var rid = (payload.refund && payload.refund.entity && payload.refund.entity.payment_id) ||
                (payload.payment && payload.payment.entity && payload.payment.entity.id);
      if (!rid) { res.status(200).json({ ok: true, skipped: "no payment id" }); return; }
      var p2 = await rzGet("payments/" + encodeURIComponent(rid));
      if (!(p2.amount_refunded > 0)) { res.status(200).json({ ok: true, skipped: "no refund on payment" }); return; }
      var c = await _cm.cancelCommission(admin, rid, "refunded");
      res.status(200).json({ ok: true, commission: c });
      return;
    }

    res.status(200).json({ ok: true, ignored: event });
  } catch (e) {
    console.error("webhook error:", e && e.message);
    // 500 makes Razorpay retry later.
    res.status(500).json({ ok: false });
  }
};
