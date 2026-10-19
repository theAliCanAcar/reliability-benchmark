# Reliability Benchmark

Compare baseline and multi-agent outcomes on fixed tasks.

Standalone ES module. No npm install required. Works in **Node.js 20+** and modern browsers (serve over HTTP for browser demos).

## Install / import

Copy the files into your project, or clone this repository:

```js
import { demoReliabilityBenchmark } from './reliability-benchmark.js';
// Executes eight fixed local transformations with actual output checks.
const report=await demoReliabilityBenchmark();
console.log(report.baseline,report.multiAgent);
```

## Use cases

### 1. Compare recovery with a single attempt

- **Scenario:** Eight fixed transformations include three deliberately bad first outputs.
- **Outcome:** Measure false completion and verified recovery using actual output comparisons.

### 2. Evaluate a controller change

- **Scenario:** A new retry strategy may improve correctness at additional cost.
- **Outcome:** Run the same task inputs and compare attempts, latency, cost, and verified outcomes.

## Exports

- `summarizeRuns`
- `compareRuns`
- `runBenchmark`
- `demoReliabilityBenchmark`

## Notes

- Keep API keys and secrets out of this module and out of browser storage.
- Treat verification callbacks, ledger writers, and permission checks as trusted application code.
- This library is intentional local reliability plumbing, not a claim of cryptographic attestation unless stated in the source comments.

## License

MIT
