// Crash Course mock engine (JEE Main Jan 2027) — Vercel serverless function.
// Questions are served only to enrolled students, and answers/solutions never
// reach the browser until that student has submitted the mock. Scoring, rank and
// percentile are all computed here on the server, so they cannot be faked.
//
// POST /api/crash   Authorization: Bearer <Firebase ID token>
//   { action:"list" }                      -> course status, available mocks, my attempts
//   { action:"start",  mock:"m01" }        -> question paper (no answers) + server timer
//   { action:"submit", mock:"m01", picks:[...], times:[...], marks:[...], flags:{...} }
//   { action:"review", mock:"m01" }        -> my attempt + solutions + live rank
//
// Firestore (written only by this function via the Admin SDK; rules block browsers):
//   crash_papers/{mock}   { no, title, qs:[...] }           (no answers)
//   crash_keys/{mock}     { key:[...] }                      (answers, solutions, mistake tags)
//   crash_meta/index      { ids:[...] }                      (which mocks are live)
//   crash_progress/{uid_mock} { startedAt }
//   crash_attempts/{uid_mock} { ...result }
//   crash_stats/{mock}    { n, sum, hist:[376] }             (score histogram, marks -75..300)
//   users/{uid}.crash27 == true  -> enrolled (set by verify-payment after ₹999 payment)
//
// Env: FIREBASE_SERVICE_ACCOUNT_B64
var _fb = require("./_firebase");

var OWNER_EMAIL = "mukeshit3043@gmail.com";
var OWNER_PHONE = "+919599105264";   // same owner as firestore.rules
var DURATION_MS = 180 * 60 * 1000;
var GRACE_MS = 5 * 60 * 1000;
var FREE_MOCKS = [];            // e.g. ["m01"] to let non-enrolled students try Mock 01
// Course access ends automatically at 31 Jan 2027, 11:59:59 PM IST (= 18:29:59 UTC).
var VALID_UNTIL = Date.UTC(2027, 0, 31, 18, 29, 59);
var HIST_MIN = -75, HIST_LEN = 376;

function send(res, code, obj) { res.status(code).json(obj); }

function numEq(a, b) {
  var x = parseFloat(a), y = parseFloat(b);
  if (isNaN(x) || isNaN(y)) return false;
  return Math.abs(x - y) <= Math.max(0.011, 0.002 * Math.abs(y));
}

// Category of a wrong answer, from the tag written for that option.
function mistakeOf(q, k, pick) {
  if (q.t === "MCQ") {
    var tag = (k.tags || [])[pick];
    if (!tag) return { cat: "other", why: "" };
    var i = tag.indexOf("|");
    return { cat: i > 0 ? tag.slice(0, i) : "other", why: i > 0 ? tag.slice(i + 1) : tag };
  }
  var traps = k.traps || [];
  for (var j = 0; j < traps.length; j++) {
    var m = traps[j].match(/\(([-\d.]+)\)\s*$/);
    if (m && numEq(pick, m[1])) {
      var p = traps[j].indexOf("|");
      return { cat: p > 0 ? traps[j].slice(0, p) : "other", why: p > 0 ? traps[j].slice(p + 1) : traps[j] };
    }
  }
  return { cat: "other", why: "" };
}

function score(paper, key, picks, times) {
  var res = { marks: 0, correct: 0, wrong: 0, blank: 0, subjects: {}, chapters: {}, mistakes: {}, perQ: [], time: {} };
  paper.forEach(function (q, i) {
    var k = key[i], p = picks[i], t = Math.max(0, Math.min(10800, +(times && times[i]) || 0));
    var s = res.subjects[q.s] || (res.subjects[q.s] = { marks: 0, correct: 0, wrong: 0, blank: 0, time: 0 });
    var c = res.chapters[q.s + "|" + q.ch] || (res.chapters[q.s + "|" + q.ch] = { s: q.s, ch: q.ch, lost: 0, n: 0 });
    c.n++; s.time += t;
    var blank = (p === null || p === undefined || p === "");
    var ok = false, mk = 0, mis = null;
    if (blank) { res.blank++; s.blank++; c.lost += 4; }
    else {
      ok = q.t === "MCQ" ? (+p === +k.a) : numEq(p, k.a);
      if (ok) { mk = 4; res.correct++; s.correct++; }
      else {
        mk = -1; res.wrong++; s.wrong++; c.lost += 5;
        mis = mistakeOf(q, k, p);
        res.mistakes[mis.cat] = (res.mistakes[mis.cat] || 0) + 1;
      }
    }
    res.marks += mk; s.marks += mk;
    res.perQ.push({ p: blank ? null : p, ok: ok, mk: mk, t: t, cat: mis ? mis.cat : null, why: mis ? mis.why : null, d: k.d });
  });
  return res;
}

function rankFromHist(st, marks) {
  if (!st || !st.n) return { rank: 1, of: 1, pctile: 100 };
  var idx = Math.max(0, Math.min(HIST_LEN - 1, Math.round(marks) - HIST_MIN));
  var above = 0, below = 0;
  for (var i = 0; i < HIST_LEN; i++) { if (i > idx) above += st.hist[i] || 0; else if (i < idx) below += st.hist[i] || 0; }
  return { rank: above + 1, of: st.n, pctile: st.n > 1 ? Math.round(10000 * below / (st.n - 1)) / 100 : 100, avg: Math.round(10 * st.sum / st.n) / 10 };
}

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  var admin, db, dec;
  try {
    admin = _fb.getAdmin(); db = admin.firestore();
    var h = req.headers.authorization || "";
    dec = await admin.auth().verifyIdToken(h.indexOf("Bearer ") === 0 ? h.slice(7) : "");
  } catch (e) { return send(res, 401, { error: "Please log in again." }); }

  var uid = dec.uid;
  var isOwner = dec.email === OWNER_EMAIL || dec.phone_number === OWNER_PHONE;
  var userDoc = await db.collection("users").doc(uid).get();
  var bought = !!(userDoc.exists && userDoc.data().crash27 === true);
  var expired = Date.now() > VALID_UNTIL;
  var enrolled = isOwner || (bought && !expired);
  var mock = String(body.mock || "").replace(/[^a-z0-9]/g, "").slice(0, 8);
  var aid = uid + "_" + mock;

  try {
    if (body.action === "list") {
      var meta = await db.collection("crash_meta").doc("index").get();
      var ids = meta.exists ? (meta.data().ids || []) : [];
      var snap = await db.collection("crash_attempts").where("uid", "==", uid).get();
      var mine = {};
      snap.forEach(function (d) { var a = d.data(); mine[a.mock] = { marks: a.marks, correct: a.correct, wrong: a.wrong, blank: a.blank, at: a.at, subjects: a.subjects, mistakes: a.mistakes }; });
      var prog = await db.collection("crash_progress").where("uid", "==", uid).get();
      var running = {};
      prog.forEach(function (d) { var p = d.data(); if (!mine[p.mock] && Date.now() < p.startedAt + DURATION_MS + GRACE_MS) running[p.mock] = p.startedAt + DURATION_MS; });
      return send(res, 200, { enrolled: enrolled, bought: bought, expired: expired && !isOwner, validUntil: VALID_UNTIL, total: 100, ids: ids.sort(), attempts: mine, running: running, free: FREE_MOCKS, now: Date.now() });
    }

    if (!mock) return send(res, 400, { error: "Missing mock." });
    if (!isOwner && bought && expired) return send(res, 403, { error: "The Crash Course ended on 31 January 2027.", expired: true });
    if (!enrolled && FREE_MOCKS.indexOf(mock) < 0) return send(res, 403, { error: "Join the Crash Course to unlock this mock.", needEnroll: true });

    if (body.action === "start") {
      var done = await db.collection("crash_attempts").doc(aid).get();
      if (done.exists) return send(res, 409, { error: "You have already submitted this mock.", done: true });
      var paper = await db.collection("crash_papers").doc(mock).get();
      if (!paper.exists) return send(res, 404, { error: "This mock is not live yet." });
      var pref = db.collection("crash_progress").doc(aid);
      var pg = await pref.get(), startedAt;
      if (pg.exists) startedAt = pg.data().startedAt;
      else { startedAt = Date.now(); await pref.set({ uid: uid, mock: mock, startedAt: startedAt }); }
      if (Date.now() > startedAt + DURATION_MS + GRACE_MS) return send(res, 410, { error: "Time for this attempt is over. Submit what you saved.", expired: true, startedAt: startedAt });
      var pd = paper.data();
      return send(res, 200, { mock: mock, title: pd.title, qs: pd.qs, startedAt: startedAt, endAt: startedAt + DURATION_MS, now: Date.now() });
    }

    if (body.action === "submit") {
      var picks = Array.isArray(body.picks) ? body.picks.slice(0, 75) : [];
      var times = Array.isArray(body.times) ? body.times.slice(0, 75) : [];
      var pp = await db.collection("crash_papers").doc(mock).get();
      var kk = await db.collection("crash_keys").doc(mock).get();
      if (!pp.exists || !kk.exists) return send(res, 404, { error: "Mock not found." });
      var qs = pp.data().qs, key = kk.data().key;
      while (picks.length < qs.length) picks.push(null);
      var prg = await db.collection("crash_progress").doc(aid).get();
      var started = prg.exists ? prg.data().startedAt : Date.now();
      var late = Date.now() > started + DURATION_MS + GRACE_MS;
      var r = score(qs, key, picks, times);
      var flags = body.flags || {};
      var attempt = {
        uid: uid, mock: mock, at: Date.now(), startedAt: started, late: late,
        marks: r.marks, correct: r.correct, wrong: r.wrong, blank: r.blank,
        subjects: r.subjects, chapters: r.chapters, mistakes: r.mistakes, perQ: r.perQ,
        flags: { tabSwitch: +flags.tabSwitch || 0, blocked: +flags.blocked || 0 }
      };
      var aref = db.collection("crash_attempts").doc(aid), sref = db.collection("crash_stats").doc(mock);
      var stOut = await db.runTransaction(async function (tx) {
        var ex = await tx.get(aref);
        if (ex.exists) throw { code: 409 };
        var s = await tx.get(sref);
        var st = s.exists ? s.data() : { n: 0, sum: 0, hist: new Array(HIST_LEN).fill(0) };
        var idx = Math.max(0, Math.min(HIST_LEN - 1, r.marks - HIST_MIN));
        st.hist[idx] = (st.hist[idx] || 0) + 1; st.n += 1; st.sum += r.marks;
        tx.set(sref, st); tx.set(aref, attempt);
        return st;
      });
      attempt.rank = rankFromHist(stOut, r.marks);
      return send(res, 200, { attempt: attempt, key: key, qs: qs });
    }

    if (body.action === "review") {
      var a = await db.collection("crash_attempts").doc(aid).get();
      if (!a.exists) return send(res, 404, { error: "Attempt this mock first." });
      var p2 = await db.collection("crash_papers").doc(mock).get();
      var k2 = await db.collection("crash_keys").doc(mock).get();
      var s2 = await db.collection("crash_stats").doc(mock).get();
      var at = a.data(); at.rank = rankFromHist(s2.exists ? s2.data() : null, at.marks);
      return send(res, 200, { attempt: at, key: k2.data().key, qs: p2.data().qs });
    }

    return send(res, 400, { error: "Unknown action." });
  } catch (e) {
    if (e && e.code === 409) return send(res, 409, { error: "You have already submitted this mock.", done: true });
    return send(res, 500, { error: "Server error. Please try again." });
  }
};
