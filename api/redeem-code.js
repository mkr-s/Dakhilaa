// Redeems an institute access code and activates the matching plan — server-side,
// so it cannot be faked from the browser. The code is single-use and carries its
// own class/plan, so an 11th-grade code can never unlock the 12th/dropper plan.
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
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }

  var admin;
  try { admin = _fb.getAdmin(); }
  catch (e) { res.status(500).json({ ok: false, error: "Server not configured yet." }); return; }

  var authH = req.headers.authorization || "";
  var token = authH.indexOf("Bearer ") === 0 ? authH.slice(7) : "";
  if (!token) { res.status(401).json({ ok: false, error: "Please sign in and try again." }); return; }

  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  var code = (body.code || "").toString().trim().toUpperCase();
  if (!code) { res.status(400).json({ ok: false, error: "Please enter your code." }); return; }

  var uid;
  try { var dec = await admin.auth().verifyIdToken(token); uid = dec.uid; }
  catch (e) { res.status(401).json({ ok: false, error: "Your session expired. Please sign in again." }); return; }

  var db = admin.firestore();
  var codeRef = db.collection("access_codes").doc(code);
  var userRef = db.collection("users").doc(uid);
  try {
    var out = await db.runTransaction(async function (t) {
      var snap = await t.get(codeRef);
      if (!snap.exists) { throw { k: "invalid" }; }
      var d = snap.data();
      if (d.active === false) { throw { k: "inactive" }; }
      if (d.used === true) { throw { k: "used" }; }
      var plan = d.plan;
      if (!PLAN_NAME[plan]) { throw { k: "badplan" }; }
      t.update(codeRef, { used: true, usedBy: uid, usedAt: admin.firestore.FieldValue.serverTimestamp() });
      t.set(userRef, {
        plan: plan,
        planName: d.planName || PLAN_NAME[plan],
        planSince: Date.now(),
        planSource: "institute:" + (d.institute || ""),
        lastCode: code
      }, { merge: true });
      return { plan: plan, planName: d.planName || PLAN_NAME[plan] };
    });
    res.status(200).json({ ok: true, plan: out.plan, planName: out.planName });
  } catch (e) {
    var k = e && e.k;
    var msg = k === "used" ? "This code has already been used."
      : k === "invalid" ? "Invalid code. Please check and try again."
      : k === "inactive" ? "This code is no longer active."
      : "Could not redeem this code. Please try again.";
    res.status(400).json({ ok: false, error: msg });
  }
};
