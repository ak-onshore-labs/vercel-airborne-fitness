import { db } from "./db";
import { classSchedule, members, memberships } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  const existing = await db.select().from(classSchedule).limit(1);
  if (existing.length > 0) return;

  const scheduleItems = [
    { classId: "aerial-fitness", category: "Aerial Fitness", branch: "Lower Parel", dayOfWeek: -1, startHour: 8, startMinute: 0, endHour: 9, endMinute: 0, capacity: 14 },
    { classId: "pilates", category: "Pilates & Mobility", branch: "Lower Parel", dayOfWeek: -1, startHour: 9, startMinute: 30, endHour: 10, endMinute: 30, capacity: 14 },
    { classId: "kids-aerial", category: "Kids Aerial Fitness", branch: "Lower Parel", dayOfWeek: -1, startHour: 16, startMinute: 0, endHour: 17, endMinute: 0, capacity: 14 },
    { classId: "aerial-hoop", category: "Aerial Hoop & Silk", branch: "Lower Parel", dayOfWeek: -1, startHour: 18, startMinute: 0, endHour: 19, endMinute: 0, capacity: 14 },
    { classId: "functional", category: "Functional Training", branch: "Lower Parel", dayOfWeek: -1, startHour: 19, startMinute: 30, endHour: 20, endMinute: 30, capacity: 14 },
    { classId: "aerial-fitness", category: "Aerial Fitness", branch: "Mazgaon", dayOfWeek: -1, startHour: 7, startMinute: 30, endHour: 8, endMinute: 30, capacity: 14 },
    { classId: "pilates", category: "Pilates & Mobility", branch: "Mazgaon", dayOfWeek: -1, startHour: 10, startMinute: 0, endHour: 11, endMinute: 0, capacity: 14 },
    { classId: "kids-aerial", category: "Kids Aerial Fitness", branch: "Mazgaon", dayOfWeek: -1, startHour: 15, startMinute: 0, endHour: 16, endMinute: 0, capacity: 14 },
    { classId: "functional", category: "Functional Training", branch: "Mazgaon", dayOfWeek: -1, startHour: 18, startMinute: 30, endHour: 19, endMinute: 30, capacity: 14 },
  ];

  const allItems: any[] = [];
  for (let dow = 0; dow <= 6; dow++) {
    for (const item of scheduleItems) {
      allItems.push({ ...item, dayOfWeek: dow, isActive: true });
    }
  }

  await db.insert(classSchedule).values(allItems);

  // Seed demo members
  const existingMember = await db.select().from(members).where(eq(members.phone, "9999977777")).limit(1);
  if (existingMember.length === 0) {
    const [member] = await db.insert(members).values({
      phone: "9999977777",
      name: "Sarah Jenkins",
      email: "sarah@example.com",
    }).returning();

    await db.insert(memberships).values([
      {
        memberId: member.id,
        category: "Aerial Fitness",
        planName: "3 Months (24 Sessions)",
        sessionsTotal: 24,
        sessionsRemaining: 14,
        price: 15500,
        expiryDate: new Date("2026-06-30"),
      },
      {
        memberId: member.id,
        category: "Functional Training",
        planName: "Monthly (8 Sessions)",
        sessionsTotal: 8,
        sessionsRemaining: 8,
        price: 5000,
        expiryDate: new Date("2026-04-21"),
      },
    ]);
  }

  console.log("Database seeded successfully");
}
