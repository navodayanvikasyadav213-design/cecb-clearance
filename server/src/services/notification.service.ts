import { prisma } from "../utils/prisma";
import { io } from "../index";

export async function createNotification(userId: string, applicationId: string, type: string, message: string) {
  const notification = await prisma.notification.create({
    data: { userId, applicationId, type, message },
  });

  // Emit via Socket.io to the specific user's room
  io.to(`user:${userId}`).emit("notification", notification);
  return notification;
}

export function emitAppStatusUpdate(applicationId: string, status: string) {
  io.to(`app:${applicationId}`).emit("status_update", { status });
}

export async function sendSmsNotification(phone: string, message: string) {
  // Mock Twilio Integration
  // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: phone });
  console.log(`[Twilio Mock] SMS sent to ${phone}: ${message}`);
}
