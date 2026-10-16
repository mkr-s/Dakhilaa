// Shared Firebase Admin initialiser for the serverless functions.
// The service-account key is stored as ONE base64 string in the Vercel env var
// FIREBASE_SERVICE_ACCOUNT_B64 (never in the website code). Admin bypasses
// Firestore rules, so only these trusted functions can set a student's plan.
var admin = require("firebase-admin");

function getAdmin() {
  if (!admin.apps.length) {
    var b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) { throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is not set"); }
    var json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}

module.exports = { getAdmin: getAdmin };
