// Vercel serverless function: verifies a Razorpay payment signature.
// This proves the payment is real and was not faked, using your secret key.
// Requires Environment Variable in the Vercel dashboard:
//   RAZORPAY_KEY_SECRET

var crypto = require("crypto");

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

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

  res.status(200).json({ valid: valid, payment_id: pid });
};
