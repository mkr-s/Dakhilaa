// Vercel serverless function: creates a Razorpay order.
// The plan PRICE is fixed here on the server, so it can't be tampered with from the browser.
// Requires two Environment Variables set in the Vercel dashboard:
//   RAZORPAY_KEY_ID      (e.g. rzp_live_xxx)
//   RAZORPAY_KEY_SECRET  (keep this secret — never put it in the website code)

// Prices are in paise (1 rupee = 100 paise). Keep these in sync with the website.
var PLANS = {
  grade11: { name: "11th Grade Prep",       amount: 149900 }, // Rs 1,499
  grade12: { name: "12th Grade Intensive",  amount: 179900 }, // Rs 1,799
  dropper: { name: "Dropper Focused",       amount: 199900 }, // Rs 1,999
  crash27: { name: "JEE Main Jan 2027 Crash Course", amount: 99900 } // Rs 999, one-time, valid till 31 Jan 2027
};
// The crash course can no longer be bought after it ends (31 Jan 2027, 11:59 PM IST).
var CRASH_VALID_UNTIL = Date.UTC(2027, 0, 31, 18, 29, 59);

// Flat-discount coupons, in paise. A code is honoured server-side so it can't be
// tampered with. The website only reveals FRIEND200 after a student's referral is
// verified. MIN_AMOUNT is a floor so a coupon can never make the price absurdly low.
var COUPONS = { FRIEND200: 20000 }; // Rs 200 off
var MIN_AMOUNT = 49900;             // never charge below Rs 499

// Influencer / partner coupons (e.g. RAHUL10): 10% off for the student, 20% commission
// for the partner. Codes live in Firestore (coupons/{CODE}); see _commission.js.
var _cm = require("./_commission");
var _fb = require("./_firebase");

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  var KEY_ID = process.env.RAZORPAY_KEY_ID;
  var KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!KEY_ID || !KEY_SECRET) { res.status(500).json({ error: "Razorpay keys are not set on the server." }); return; }

  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  var plan = PLANS[body.plan];
  if (!plan) { res.status(400).json({ error: "Invalid plan." }); return; }
  if (body.plan === "crash27" && Date.now() > CRASH_VALID_UNTIL) { res.status(400).json({ error: "The JEE Main Jan 2027 Crash Course has ended." }); return; }

  // Who is buying (optional). If the browser sends its Firebase login token we store the
  // student's uid in the order, so the payment can be matched to them even if the tab closes.
  var uid = "";
  var authH = req.headers.authorization || "";
  if (authH.indexOf("Bearer ") === 0) {
    try { uid = (await _fb.getAdmin().auth().verifyIdToken(authH.slice(7))).uid; } catch (e) { uid = ""; }
  }

  // Apply a valid coupon (optional). Unknown/empty coupon = full price, unchanged.
  // Only ONE coupon per order (a partner code and FRIEND200 never stack).
  var amount = plan.amount, couponCode = "", discount = 0, partnerUid = "", couponMsg = "";
  var code = _cm.cleanCode(body.coupon);
  if (code && COUPONS[code]) {
    discount = COUPONS[code];
    amount = Math.max(plan.amount - discount, MIN_AMOUNT);
    couponCode = code;
  } else if (code) {
    var pc = null;
    try { pc = await _cm.findPartnerCoupon(_fb.getAdmin().firestore(), code); } catch (e) { pc = null; }
    if (pc && uid && pc.partnerUid === uid) {
      couponMsg = "You can't use your own partner code.";
    } else if (pc) {
      amount = Math.max(_cm.discounted(plan.amount), MIN_AMOUNT);
      discount = plan.amount - amount;
      couponCode = pc.code;
      partnerUid = pc.partnerUid;
    } else {
      couponMsg = "This code is not valid.";
    }
  }

  // Price check only (no order is created) — lets the checkout show the new price.
  if (body.preview === true) {
    res.status(200).json({
      plan_name: plan.name, list_amount: plan.amount, amount: amount, discount: discount,
      coupon: couponCode, valid: !!couponCode, message: couponCode ? "" : couponMsg
    });
    return;
  }

  // Owner-only Rs 1 LIVE test. Gated by a server secret (Vercel env TEST_SECRET)
  // that is NEVER in the website code, so a student can never trigger a cheap
  // order. When authorised, it overrides the amount to Rs 1 and the MIN floor.
  if (body.test === true) {
    if (!process.env.TEST_SECRET || body.test_secret !== process.env.TEST_SECRET) {
      res.status(403).json({ error: "Test payment not authorized." });
      return;
    }
    amount = 100;        // Rs 1 (100 paise)
    couponCode = "TEST1";
    discount = 0;
    partnerUid = "";   // a test payment never earns commission
  }

  var auth = Buffer.from(KEY_ID + ":" + KEY_SECRET).toString("base64");
  try {
    var r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": "Basic " + auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount,
        currency: "INR",
        receipt: "dak_" + Date.now(),
        notes: {
          plan: body.plan,
          email: (body.email || "").toString().slice(0, 100),
          name: (body.name || "").toString().slice(0, 80),
          coupon: couponCode,
          uid: uid,
          partnerUid: partnerUid,
          list_amount: String(plan.amount)
        }
      })
    });
    var data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: (data && data.error && data.error.description) || "Order creation failed." });
      return;
    }
    res.status(200).json({
      order_id: data.id,
      amount: amount,
      currency: "INR",
      key_id: KEY_ID,
      plan_name: plan.name,
      coupon: couponCode,
      discount: discount
    });
  } catch (e) {
    res.status(500).json({ error: "Server error while creating the order." });
  }
};
