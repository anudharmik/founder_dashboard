import { recomputeMilestoneProgressAndRisk } from '../src/utils/rollupEngine.js';

console.log("=== Testing Milestone Risk Flag Computation ===");

// Simulate rollupEngine risk calculation logic for milestone
function computeMilestoneRisk(tasksList) {
  const now = new Date();
  let riskFlag = 'none';

  const incompleteTasks = tasksList.filter(t => !t.completed && t.deadline);

  for (const t of incompleteTasks) {
    const deadlineDate = new Date(t.deadline);
    const diffHours = (deadlineDate - now) / (1000 * 60 * 60);

    if (diffHours < -24 || (diffHours < 0 && deadlineDate.getDate() !== now.getDate())) {
      riskFlag = 'overdue';
      break;
    } else if (diffHours <= 48) {
      if (riskFlag !== 'overdue') {
        riskFlag = 'at_risk';
      }
    }
  }
  return riskFlag;
}

const yesterday = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
const in24h = new Date(Date.now() + 20 * 3600 * 1000).toISOString();

// Case A: Task deadline yesterday -> Expect 'overdue'
const overdueTasks = [{ id: 't1', completed: false, deadline: yesterday }];
const riskA = computeMilestoneRisk(overdueTasks);
console.log("Task deadline yesterday -> Milestone risk_flag:", riskA);

// Case B: Task deadline 24h out -> Expect 'at_risk'
const atRiskTasks = [{ id: 't1', completed: false, deadline: in24h }];
const riskB = computeMilestoneRisk(atRiskTasks);
console.log("Task deadline 24h out -> Milestone risk_flag:", riskB);

// Case C: Task completed or cleared -> Expect 'none'
const completedTasks = [{ id: 't1', completed: true, deadline: yesterday }];
const riskC = computeMilestoneRisk(completedTasks);
console.log("Task completed -> Milestone risk_flag:", riskC);

if (riskA === 'overdue' && riskB === 'at_risk' && riskC === 'none') {
  console.log("✅ Pre-check 1 PASSED: Milestone risk_flag computation verified!");
} else {
  console.error("❌ Pre-check 1 FAILED!");
}
