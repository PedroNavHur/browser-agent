"use node";

import type { Stagehand } from "@browserbasehq/stagehand";

export async function prepareResultsView(
  page: Stagehand["page"],
  slugUrl: string,
  filterInstructions: string[],
  resultLimit: number,
  recordLog: (message: string) => void
) {
  console.log("stagehand:navigate", { url: slugUrl });
  recordLog(`Navigating to ${slugUrl}`);
  await page.goto(slugUrl);

  await page.act(
    "Close any popups or overlays so that the listings grid and map are both visible."
  );
  recordLog("Ensuring map and results are visible");

  for (const step of filterInstructions) {
    recordLog(step);
    await page.act(step);
  }

  await page.act(
    `Scroll the listings panel slowly through multiple screens, pausing after each movement so new property cards can load. Keep going until either the bottom is reached or roughly ${resultLimit} unique property cards have appeared, then scroll back near the top leaving several cards visible.`
  );
  recordLog("Scrolling through results to load more listings");
}
