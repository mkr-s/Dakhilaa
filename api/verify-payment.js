// Verifies a Razorpay payment signature, then — only if the signature is genuine —
// sets the student's plan SERVER-SIDE (Firebase Admin). Because Firestore rules now
// block the browser from writing the `plan` field, this is the only way a paid plan
// gets activated, so it cannot be faked from the browser.
//
// Env required: RAZORPAY_KEY_SECRET, FIREBASE_SERVICE_ACCOUNT_B64
var crypto = require("crypto");
var _fb = require("./_firebase");

var PLAN_NAME = {
  grade11: "11th Grade Prep",
  grade12: "12th Grade Intensive",
  dropper: "Dropper Focused"
};

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ valid: false, error: "Method not allowed" }); return; }

  var KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!KEY_SECRET) { res.status(500).json({ valid: false, error: "Server not configured." }); return; }

  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  var oid = body.razorpay_order_id, pid = body.razorpay_payment_id, sig = body.razorpay_signature;
  if (!oid || !pid || !sig) { res.status(400).json({ valid: false, error: "Missing payment fields." }); return; }

  var expected = crypto.createHmac("sha256", KEY_SECRET).update(oid + "|" + pid).digest("hex");
  var valid = false;
  try {
    valid = expected.length === sig.length &&
            crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch (e) { valid = false; }

  if (!valid) { res.status(200).json({ valid: false, payment_id: pid }); return; }

  // Signature is genuine. If this was a real plan purchase (plan + signed-in user),
  // activate the plan server-side. (The owner Rs 1 test sends no plan, so it is skipped.)
  var planSet = false;
  var planKey = (body.plan || "").toString();
  var authH = req.headers.authorization || "";
  var token = authH.indexOf("Bearer ") === 0 ? authH.slice(7) : "";
  if (PLAN_NAME[planKey] && token) {
    try {
      var admin = _fb.getAdmin();
      var dec = await admin.auth().verifyIdToken(token);
      await admin.firestore().collection("users").doc(dec.uid).set({
        plan: planKey,
        planName: PLAN_NAME[planKey],
        planSince: Date.now(),
        lastPaymentId: pid,
        planSource: "payment"
      }, { merge: true });
      planSet = true;
    } catch (e) { planSet = false; }
  }

  res.status(200).json({ valid: true, payment_id: pid, planSet: planSet });
};
