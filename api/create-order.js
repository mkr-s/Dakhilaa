// Vercel serverless function: creates a Razorpay order.
// The plan PRICE is fixed here on the server, so it can't be tampered with from the browser.
// Requires two Environment Variables set in the Vercel dashboard:
//   RAZORPAY_KEY_ID      (e.g. rzp_live_xxx)
//   RAZORPAY_KEY_SECRET  (keep this secret — never put it in the website code)

// Prices are in paise (1 rupee = 100 paise). Keep these in sync with the website.
var PLANS = {
  grade11: { name: "11th Grade Prep",       amount: 149900 }, // Rs 1,499
  grade12: { name: "12th Grade Intensive",  amount: 179900 }, // Rs 1,799
  dropper: { name: "Dropper Focused",       amount: 199900 }  // Rs 1,999
};

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

  var auth = Buffer.from(KEY_ID + ":" + KEY_SECRET).toString("base64");
  try {
    var r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": "Basic " + auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: plan.amount,
        currency: "INR",
        receipt: "dak_" + Date.now(),
        notes: { plan: body.plan, email: (body.email || ""), name: (body.name || "") }
      })
    });
    var data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: (data && data.error && data.error.description) || "Order creation failed." });
      return;
    }
    res.status(200).json({
      order_id: data.id,
      amount: plan.amount,
      currency: "INR",
      key_id: KEY_ID,
      plan_name: plan.name
    });
  } catch (e) {
    res.status(500).json({ error: "Server error while creating the order." });
  }
};
