// Owner-only: bulk-imports institute access codes into Firestore `access_codes`.
// The body is the JSON object produced by the code generator: { "<CODE>": {plan,...}, ... }.
// Only the owner account (verified server-side) can call this.
var _fb = require("./_firebase");

var OWNER_EMAIL = "mukeshit3043@gmail.com";
var OWNER_PHONE = "+919599105264";   // owner also logs in with this mobile (token has no email)
var VALID_PLANS = { grade11: 1, grade12: 1, dropper: 1 };

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }

  var admin;
  try { admin = _fb.getAdmin(); }
  catch (e) { res.status(500).json({ ok: false, error: "Server not configured yet." }); return; }

  var authH = req.headers.authorization || "";
  var token = authH.indexOf("Bearer ") === 0 ? authH.slice(7) : "";
  if (!token) { res.status(401).json({ ok: false, error: "Please sign in as the owner." }); return; }

  var email = "", phone = "";
  try { var dec = await admin.auth().verifyIdToken(token); email = (dec.email || "").toLowerCase(); phone = dec.phone_number || ""; }
  catch (e) { res.status(401).json({ ok: false, error: "Session expired. Sign in again." }); return; }
  if (email !== OWNER_EMAIL && phone !== OWNER_PHONE) { res.status(403).json({ ok: false, error: "Owner only." }); return; }

  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  var codes = body.codes || body; // accept {codes:{...}} or the raw map
  if (!codes || typeof codes !== "object" || Array.isArray(codes)) {
    res.status(400).json({ ok: false, error: "Paste the import JSON (a map of code -> details)." });
    return;
  }

  var db = admin.firestore();
  var ids = Object.keys(codes);
  if (ids.length === 0) { res.status(400).json({ ok: false, error: "No codes found in the JSON." }); return; }
  if (ids.length > 500) { res.status(400).json({ ok: false, error: "Import up to 500 codes per batch." }); return; }

  var batch = db.batch(), written = 0, skipped = 0;
  for (var i = 0; i < ids.length; i++) {
    var id = (ids[i] || "").toString().trim().toUpperCase();
    var d = codes[ids[i]] || {};
    if (!id || !VALID_PLANS[d.plan]) { skipped++; continue; }
    batch.set(db.collection("access_codes").doc(id), {
      plan: d.plan,
      planName: d.planName || "",
      institute: d.institute || "",
      instituteSlug: d.instituteSlug || "",
      cls: d["class"] || d.cls || "",
      used: false,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    written++;
  }
  try {
    await batch.commit();
    res.status(200).json({ ok: true, written: written, skipped: skipped });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Could not write codes. Please try again." });
  }
};
