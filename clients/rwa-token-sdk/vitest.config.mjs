import { basename } from "node:path";
import { defineConfig } from "vitest/config";
import { BaseSequencer } from "vitest/node";

class ClockSuiteLast extends BaseSequencer {
	/** @param {import("vitest/node").TestSpecification[]} files */
	async sort(files) {
		const sorted = await super.sort(files);
		const changesClock = (file) => basename(file.moduleId) === "mint-controls.test.ts";
		return sorted.sort((left, right) => Number(changesClock(left)) - Number(changesClock(right)));
	}
}

export default defineConfig({
	test: {
		// All files share one validator. Finish other suites before changing its clock.
		fileParallelism: false,
		sequence: { sequencer: ClockSuiteLast },
		testTimeout: 240_000,
	},
});
