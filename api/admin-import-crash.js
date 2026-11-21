// Owner-only: uploads one Crash Course mock (crash_mNN.json) into Firestore.
// The question paper and the answer key are stored in SEPARATE collections so that
// students can never read answers before submitting. Called from the owner panel
// inside app.html → Crash Course. The JSON files stay on the owner's computer —
// they are never put in the website repo, so they cannot be downloaded.
//
// Env: FIREBASE_SERVICE_ACCOUNT_B64
var _fb = require("./_firebase");
var OWNER_EMAIL = "mukeshit3043@gmail.com";
var OWNER_PHONE = "+919599105264";   // same owner as firestore.rules

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  var admin, dec;
  try {
    admin = _fb.getAdmin();
    var h = req.headers.authorization || "";
    dec = await admin.auth().verifyIdToken(h.indexOf("Bearer ") === 0 ? h.slice(7) : "");
  } catch (e) { res.status(401).json({ error: "Not signed in." }); return; }
  if (dec.email !== OWNER_EMAIL && dec.phone_number !== OWNER_PHONE) { res.status(403).json({ error: "Owner only." }); return; }

  var b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  var id = String(b.id || "");
  if (!/^m\d{2,3}$/.test(id) || !Array.isArray(b.paper) || !Array.isArray(b.key) || b.paper.length !== b.key.length || b.paper.length < 1) {
    res.status(400).json({ error: "Not a valid crash course mock file." }); return;
  }
  var db = admin.firestore();
  // SAFETY: never replace a mock that students have already attempted — their saved
  // answers, scores and reviews depend on that exact paper. New mocks (m61…m100) are
  // simply added; existing papers, purchases and attempt history are never touched.
  var existing = await db.collection("crash_papers").doc(id).get();
  if (existing.exists) {
    var taken = await db.collection("crash_attempts").where("mock", "==", id).limit(1).get();
    if (!taken.empty) { res.status(409).json({ error: id + " already has student attempts, so it was NOT replaced (their records stay safe)." }); return; }
  }
  await db.collection("crash_papers").doc(id).set({ no: +b.no || 0, title: String(b.title || id), qs: b.paper });
  await db.collection("crash_keys").doc(id).set({ key: b.key });
  await db.collection("crash_meta").doc("index").set({ ids: admin.firestore.FieldValue.arrayUnion(id), updated: Date.now() }, { merge: true });
  res.status(200).json({ ok: true, id: id, questions: b.paper.length });
};
