import cron from "node-cron";
import { prisma } from "../utils/prisma";
import { createNotification } from "./notification.service";
import { logger } from "../utils/logger";

export function initCronJobs() {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    logger.info("Running daily SLA auto-escalation check...");
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const staleApps = await prisma.application.findMany({
        where: {
          status: "UNDER_SCRUTINY",
          updatedAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      for (const app of staleApps) {
        logger.warn(`SLA Breach for Application ${app.id}`);
        // Notify proponent
        await createNotification(
          app.proponentId,
          app.id,
          "SLA_BREACH",
          "Your application has been under scrutiny for more than 7 days. Escalating to higher authorities."
        );
      }
    } catch (e) {
      logger.error("Error running SLA cron job", e);
    }
  });
}
