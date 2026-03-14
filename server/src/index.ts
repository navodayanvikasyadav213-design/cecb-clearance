import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

import { initCronJobs } from "./services/cron.service";

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: env.CLIENT_URL, credentials: true }
});

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on("join", (applicationId: string) => {
    socket.join(`app:${applicationId}`);
  });

  socket.on("join_user", (userId: string) => {
    socket.join(`user:${userId}`);
  });
});

// Initialize scheduled cron jobs
initCronJobs();

httpServer.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});