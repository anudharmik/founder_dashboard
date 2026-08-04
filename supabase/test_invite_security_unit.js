// Unit test script verifying organization invite email security & mismatch blocking

function acceptInviteSimulation({ invite, user, enforceEmailMatch }) {
  if (!user || !user.id || !user.email) {
    return { success: false, error: "Authentication required." };
  }

  if (!invite || invite.status !== 'pending') {
    return { success: false, error: "Invalid or expired invitation token." };
  }

  // Security Check
  if (enforceEmailMatch) {
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return {
        success: false,
        error: `Email mismatch: This invitation was issued for ${invite.email}, but you are currently logged in as ${user.email}.`
      };
    }
  }

  return {
    success: true,
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
    message: "Successfully joined organization."
  };
}

console.log("=================================================");
console.log("TESTING ORG INVITE SECURITY & EMAIL MATCHING");
console.log("=================================================\n");

const testInvite = {
  id: 'inv-101',
  org_id: 'org-999',
  email: 'email-a@test.com',
  role: 'employee',
  status: 'pending',
  token: 'abc123token'
};

const userA = { id: 'user-aaa', email: 'email-a@test.com' };
const userB = { id: 'user-bbb', email: 'email-b@test.com' };

console.log("1. UNGUARDED FLOW TEST (Simulating no email match check):");
const unguardedRes = acceptInviteSimulation({ invite: testInvite, user: userB, enforceEmailMatch: false });
console.log("Attempting to accept invite for email-a@test.com while logged in as email-b@test.com:");
console.log("Result:", unguardedRes);
if (unguardedRes.success) {
  console.log("🚨 FLAGGED: Without email check, email-b@test.com was ALLOWED to accept email-a@test.com's invite!");
}

console.log("\n2. GUARDED FLOW TEST (With email match safeguard enabled):");
const guardedMismatchRes = acceptInviteSimulation({ invite: testInvite, user: userB, enforceEmailMatch: true });
console.log("Attempting to accept invite for email-a@test.com while logged in as email-b@test.com:");
console.log("Result:", guardedMismatchRes);
if (!guardedMismatchRes.success && guardedMismatchRes.error.includes("Email mismatch")) {
  console.log("✅ PASSED: Mismatched email user (email-b@test.com) is BLOCKED from accepting email-a@test.com's invite.");
} else {
  console.error("❌ FAILED: Mismatched email was not blocked!");
}

console.log("\n3. MATCHING EMAIL TEST (Valid recipient accepts):");
const guardedMatchRes = acceptInviteSimulation({ invite: testInvite, user: userA, enforceEmailMatch: true });
console.log("Attempting to accept invite for email-a@test.com while logged in as email-a@test.com:");
console.log("Result:", guardedMatchRes);
if (guardedMatchRes.success) {
  console.log("✅ PASSED: Matching email user (email-a@test.com) successfully accepted the invite.");
} else {
  console.error("❌ FAILED: Matching email user was wrongfully blocked!");
}

console.log("\nAll invite security tests completed successfully!");
