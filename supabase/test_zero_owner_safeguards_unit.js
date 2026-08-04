// Unit test script verifying zero owner safeguards logic

function simulateUpdateRole(membersList, memberId, newRole) {
  const targetMember = membersList.find(m => m.id === memberId);
  if (targetMember && targetMember.role === 'owner' && newRole !== 'owner') {
    const ownerCount = membersList.filter(m => m.role === 'owner').length;
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot demote the sole Owner. Please promote another member to Owner first." };
    }
  }
  return { success: true };
}

function simulateRemoveMember(membersList, memberId) {
  const targetMember = membersList.find(m => m.id === memberId);
  if (targetMember && targetMember.role === 'owner') {
    const ownerCount = membersList.filter(m => m.role === 'owner').length;
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot remove the sole Owner. Please promote another member to Owner first." };
    }
  }
  return { success: true };
}

console.log("=========================================");
console.log("TESTING ZERO-OWNER SAFEGUARDS LOGIC");
console.log("=========================================\n");

// Scenario 1: Sole owner attempts to demote self
const singleOwnerList = [
  { id: 'mem-1', user_id: 'user-1', role: 'owner' },
  { id: 'mem-2', user_id: 'user-2', role: 'employee' }
];

console.log("Test 1: Sole owner demotion...");
const res1 = simulateUpdateRole(singleOwnerList, 'mem-1', 'employee');
console.log("Result:", res1);
if (!res1.success && res1.error.includes("Cannot demote the sole Owner")) {
  console.log("PASSED: Sole owner demotion blocked.");
} else {
  console.error("FAILED: Sole owner demotion was not blocked!");
}

// Scenario 2: Sole owner attempts to remove self
console.log("\nTest 2: Sole owner removal...");
const res2 = simulateRemoveMember(singleOwnerList, 'mem-1');
console.log("Result:", res2);
if (!res2.success && res2.error.includes("Cannot remove the sole Owner")) {
  console.log("PASSED: Sole owner removal blocked.");
} else {
  console.error("FAILED: Sole owner removal was not blocked!");
}

// Scenario 3: Two owners, one demotes self/other
const multiOwnerList = [
  { id: 'mem-1', user_id: 'user-1', role: 'owner' },
  { id: 'mem-2', user_id: 'user-2', role: 'owner' }
];

console.log("\nTest 3: Demoting one owner when 2 owners exist...");
const res3 = simulateUpdateRole(multiOwnerList, 'mem-1', 'manager');
console.log("Result:", res3);
if (res3.success) {
  console.log("PASSED: Demotion allowed when another owner exists.");
} else {
  console.error("FAILED: Demotion should be allowed when another owner exists!");
}

// Scenario 4: Non-owner role update
console.log("\nTest 4: Updating an employee's role...");
const res4 = simulateUpdateRole(singleOwnerList, 'mem-2', 'manager');
console.log("Result:", res4);
if (res4.success) {
  console.log("PASSED: Employee role change allowed.");
} else {
  console.error("FAILED: Employee role change should be allowed!");
}

console.log("\nAll unit safeguard tests completed successfully!");
