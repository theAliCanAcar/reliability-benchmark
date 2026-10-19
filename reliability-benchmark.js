const nonnegative = (value, label) => { if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be finite and nonnegative`); return value; };
/** Rates use total runs; recovery uses runs with failed attempts as its denominator. */
export function summarizeRuns(records) {
  if (!Array.isArray(records)) throw new TypeError('Runs must be an array');
  const totals = records.reduce((sum, run) => {
    if (typeof run.completed !== 'boolean' || typeof run.verified !== 'boolean') throw new TypeError('Each run needs completed and verified booleans');
    sum.falseCompletions += Number(run.completed && !run.verified);
    sum.verifiedCompletions += Number(run.completed && run.verified);
    sum.failedRuns += Number((run.failedAttempts ?? 0) > 0);
    sum.recoveries += Number((run.failedAttempts ?? 0) > 0 && run.completed && run.verified);
    sum.interventions += Number(Boolean(run.intervention));
    for (const key of ['attempts', 'latencyMs', 'costUsd', 'failedAttempts']) sum[key] += nonnegative(run[key] ?? 0, key);
    return sum;
  }, { falseCompletions: 0, verifiedCompletions: 0, failedRuns: 0, recoveries: 0, interventions: 0, attempts: 0, latencyMs: 0, costUsd: 0, failedAttempts: 0 });
  const count = records.length;
  return { count, falseCompletionRate: count ? totals.falseCompletions / count : 0, verifiedCompletionRate: count ? totals.verifiedCompletions / count : 0, recoveryRate: totals.failedRuns ? totals.recoveries / totals.failedRuns : 0, interventionRate: count ? totals.interventions / count : 0, attemptsPerTask: count ? totals.attempts / count : 0, averageLatencyMs: count ? totals.latencyMs / count : 0, totalCostUsd: totals.costUsd, totals };
}
export function compareRuns({ baseline, multiAgent }) { return { baseline: summarizeRuns(baseline), multiAgent: summarizeRuns(multiAgent) }; }
/** Both runners receive isolated copies of each fixed task and the repetition index. */
export async function runBenchmark({ tasks, baseline, multiAgent, repetitions = 1 }) {
  if (!Array.isArray(tasks) || !tasks.length || !Number.isSafeInteger(repetitions) || repetitions < 1) throw new TypeError('Provide tasks and positive integer repetitions');
  const runs = { baseline: [], multiAgent: [] };
  for (let repeat = 0; repeat < repetitions; repeat++) for (const task of tasks) {
    for (const [name, runner] of Object.entries({ baseline, multiAgent })) {
      const outcome = await runner(JSON.parse(JSON.stringify(task)), repeat);
      runs[name].push({ ...outcome, taskId: task.id, repeat });
    }
  }
  return { runs, ...compareRuns(runs) };
}
/** Eight local tasks with fixed acceptance checks. Seeded defects exercise bounded repair. */
export function demoReliabilityBenchmark() {
  const tasks = [
    { id: 'sum', operation: 'sum', input: [2, 3, 5], expected: 10, seededFailure: true },
    { id: 'minimum', operation: 'minimum', input: [8, -3, 4], expected: -3, seededFailure: false },
    { id: 'maximum', operation: 'maximum', input: [8, -3, 4], expected: 8, seededFailure: false },
    { id: 'count', operation: 'count', input: ['a', 'b', 'c'], expected: 3, seededFailure: true },
    { id: 'reverse', operation: 'reverse', input: 'agent', expected: 'tnega', seededFailure: false },
    { id: 'uppercase', operation: 'uppercase', input: 'done', expected: 'DONE', seededFailure: false },
    { id: 'join', operation: 'join', input: ['done', 'means', 'done'], expected: 'done means done', seededFailure: true },
    { id: 'sort', operation: 'sort', input: [10, 2, 1], expected: [1, 2, 10], seededFailure: false },
  ];
  function build(task, repair = false) {
    const operations = {
      sum: input => input.reduce((total, value) => total + value, 0),
      minimum: input => Math.min(...input),
      maximum: input => Math.max(...input),
      count: input => input.length,
      reverse: input => [...input].reverse().join(''),
      uppercase: input => input.toUpperCase(),
      join: input => input.join(' '),
      sort: input => [...input].sort((a, b) => a - b),
    };
    const output = operations[task.operation](task.input);
    if (!repair && task.seededFailure) return typeof output === 'number' ? output + 1 : `${output}!`;
    return output;
  }
  function run(task, allowRepair) {
    const started = performance.now();
    const checks = [];
    let output = build(task);
    function verify() {
      const passed = JSON.stringify(output) === JSON.stringify(task.expected);
      checks.push({ attempt: checks.length + 1, output, expected: task.expected, passed });
      return passed;
    }
    let verified = verify();
    if (!verified && allowRepair) { output = build(task, true); verified = verify(); }
    return {
      completed: allowRepair ? verified : true,
      verified,
      attempts: checks.length,
      failedAttempts: checks.filter(check => !check.passed).length,
      latencyMs: performance.now() - started,
      costUsd: 0,
      output,
      checks,
    };
  }
  return runBenchmark({ tasks, baseline: task => run(task, false), multiAgent: task => run(task, true) });
}
