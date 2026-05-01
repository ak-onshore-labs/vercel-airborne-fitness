import { connectDb } from "./db";
import {
  UserModel,
  ClassTypeModel,
  MembershipPlanModel,
  ScheduleSlotModel,
  MemberModel,
  MembershipModel,
  AppSettingModel,
} from "./models";

const CLASS_TYPE_DATA: Array<{
  name: string;
  ageGroup: string;
  strengthLevel: number;
  infoBullets: string[];
}> = [
  {
    name: "Trampoline Fitness",
    ageGroup: "Adults",
    strengthLevel: 1,
    infoBullets: [
      "Full-body strength & endurance training",
      "Core activation through controlled jumps",
      "Fat-burning without joint stress",
      "Improves lymphatic system",
    ],
  },
  {
    name: "Mat Pilates",
    ageGroup: "Adults",
    strengthLevel: 1,
    infoBullets: [
      "Core strength & stability",
      "Posture correction & alignment",
      "Controlled, low-impact movements",
      "Full-body toning & endurance",
      "Injury-preventive strengthening",
      "Joint mobility & range of motion",
      "Muscle release & flexibility",
    ],
  },
  {
    name: "Kids Aerial Fitness",
    ageGroup: "Kids",
    strengthLevel: 1,
    infoBullets: [
      "Basics of aerial hammock",
      "Flexibility, Balance, coordination & spatial awareness",
      "Creative movement & simple flows",
      "Builds confidence & body awareness",
      "Improves posture & focus",
      "Age-appropriate progressions",
    ],
  },
  {
    name: "Aerial Fitness",
    ageGroup: "Adults",
    strengthLevel: 1,
    infoBullets: [
      "Aerial hammock basics & foundation",
      "Mix of Pilates, yoga and Strength on the hammock",
      "Flexibility & mobility training",
      "Balance, coordination & body control",
      "No prior fitness or aerial experience needed",
      "No age bar, no gender bar, no weight bar",
    ],
  },
  {
    name: "Kids Advance Aerial (Hammock, Silk, Hoop)",
    ageGroup: "Kids",
    strengthLevel: 3,
    infoBullets: [
      "Multi-apparatus skill development",
      "Advanced climbs, wraps & transition",
      "Dynamic sequences & aerial combinations",
      "Kids with prior aerial experience",
      "Students who have cleared basics assessment",
    ],
  },
  {
    name: "Aerial Hoop & Silk",
    ageGroup: "Adults",
    strengthLevel: 2,
    infoBullets: [
      "Basic & advanced climbs",
      "Wraps, locks & safe foot techniques",
      "Strength & flexibility training",
      "Drops & transitions (level-appropriate)",
      "Flow sequences & endurance building",
      "Body awareness, control & confidence",
    ],
  },
  {
    name: "Functional Training",
    ageGroup: "Adults",
    strengthLevel: 1,
    infoBullets: [
      "Core stability & balance training",
      "Endurance & conditioning",
      "Safe, scalable & effective",
      "Beginner friendly",
      "All fitness levels welcome",
      "No age, gender or weight bar",
    ],
  },
];

const PLANS_DATA: Record<
  string,
  Array<{ name: string; sessionsTotal: number; validityDays: number; price: number }>
> = {
  "Functional Training": [
    { name: "Walk-in/Trial", sessionsTotal: 1, validityDays: 7, price: 1000 },
    { name: "Monthly", sessionsTotal: 12, validityDays: 30, price: 5000 },
    { name: "3 Months", sessionsTotal: 36, validityDays: 90, price: 13500 },
    { name: "6 Months", sessionsTotal: 72, validityDays: 180, price: 27000 },
    { name: "12 Months", sessionsTotal: 144, validityDays: 365, price: 50000 },
  ],
  "Kids Advance Aerial (Hammock, Silk, Hoop)": [
    { name: "Walk-in/Trial", sessionsTotal: 1, validityDays: 7, price: 1000 },
    { name: "Monthly", sessionsTotal: 8, validityDays: 30, price: 7000 },
    { name: "3 Months", sessionsTotal: 24, validityDays: 90, price: 20000 },
  ],
  "Aerial Fitness": [
    { name: "Walk-in/Trial", sessionsTotal: 1, validityDays: 7, price: 1000 },
    { name: "4 Sessions", sessionsTotal: 4, validityDays: 30, price: 3000 },
    { name: "Monthly", sessionsTotal: 8, validityDays: 30, price: 5500 },
    { name: "3 Months", sessionsTotal: 24, validityDays: 90, price: 15500 },
    { name: "6 Months", sessionsTotal: 48, validityDays: 180, price: 30000 },
    { name: "12 Months", sessionsTotal: 96, validityDays: 365, price: 58000 },
  ],
  "Aerial Hoop & Silk": [
    { name: "Walk-in/Trial", sessionsTotal: 1, validityDays: 7, price: 1000 },
    { name: "Monthly", sessionsTotal: 8, validityDays: 30, price: 7000 },
    { name: "3 Months", sessionsTotal: 24, validityDays: 90, price: 20000 },
  ],
  "Kids Aerial Fitness": [
    { name: "Walk-in/Trial", sessionsTotal: 1, validityDays: 7, price: 1000 },
    { name: "Monthly", sessionsTotal: 8, validityDays: 30, price: 6000 },
    { name: "3 Months", sessionsTotal: 24, validityDays: 90, price: 17000 },
    { name: "6 Months", sessionsTotal: 48, validityDays: 180, price: 33000 },
    { name: "12 Months", sessionsTotal: 96, validityDays: 365, price: 64000 },
  ],
  "Trampoline Fitness": [
    { name: "Walk-in/Trial", sessionsTotal: 1, validityDays: 7, price: 1000 },
    { name: "Monthly", sessionsTotal: 8, validityDays: 30, price: 5000 },
    { name: "3 Months", sessionsTotal: 24, validityDays: 90, price: 14000 },
  ],
  "Mat Pilates": [
    { name: "Walk-in/Trial", sessionsTotal: 1, validityDays: 7, price: 1000 },
    { name: "8 Sessions", sessionsTotal: 8, validityDays: 30, price: 5000 },
    { name: "12 Sessions", sessionsTotal: 12, validityDays: 45, price: 7500 },
  ],
};

export async function seedDatabase() {
  await connectDb();

  const existing = await ClassTypeModel.findOne();

  if (process.env.RESET_SEED === "true") {
    await ScheduleSlotModel.deleteMany({});
    await MembershipPlanModel.deleteMany({});
    await ClassTypeModel.deleteMany({});
  } else if (existing) {
    return;
  }

  const insertedTypes = await ClassTypeModel.insertMany(
    CLASS_TYPE_DATA.map((d) => ({
      name: d.name,
      ageGroup: d.ageGroup,
      strengthLevel: d.strengthLevel,
      infoBullets: d.infoBullets,
      isActive: true,
    }))
  );

  const nameToId: Record<string, string> = {};
  for (const t of insertedTypes) nameToId[t.name] = t._id.toString();

  for (const [className, plans] of Object.entries(PLANS_DATA)) {
    const classTypeId = nameToId[className];
    if (!classTypeId) continue;
    await MembershipPlanModel.insertMany(
      plans.map((p) => ({
        classTypeId,
        name: p.name,
        sessionsTotal: p.sessionsTotal,
        validityDays: p.validityDays,
        price: p.price,
        gstInclusive: false,
        isActive: true,
      }))
    );
  }

  const branches = ["Lower Parel", "Mazgaon"] as const;
  const slotRows: Array<{
    classTypeId: string;
    branch: string;
    dayOfWeek: number;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    capacity: number;
    notes?: string;
    isActive: boolean;
  }> = [];

  const addSlots = (
    className: string,
    days: number[],
    startH: number,
    startM: number,
    endH: number,
    endM: number,
    notes?: string
  ) => {
    const id = nameToId[className];
    if (!id) return;
    for (const b of branches) {
      for (const d of days) {
        slotRows.push({
          classTypeId: id,
          branch: b,
          dayOfWeek: d,
          startHour: startH,
          startMinute: startM,
          endHour: endH,
          endMinute: endM,
          capacity: 14,
          isActive: true,
          notes,
        });
      }
    }
  };

  const mon = 1,
    tue = 2,
    wed = 3,
    thu = 4,
    fri = 5,
    sat = 6,
    sun = 0;

  addSlots("Functional Training", [mon, wed, fri], 7, 0, 8, 0);
  addSlots("Functional Training", [mon, wed, fri], 18, 0, 19, 0);
  addSlots("Kids Advance Aerial (Hammock, Silk, Hoop)", [mon, fri], 17, 0, 18, 0);
  addSlots("Aerial Fitness", [mon], 9, 0, 10, 0);
  addSlots("Aerial Fitness", [tue, thu], 8, 0, 9, 0);
  addSlots("Aerial Fitness", [tue, thu], 18, 0, 19, 0);
  addSlots("Aerial Fitness", [tue, thu], 19, 0, 20, 0);
  addSlots("Aerial Fitness", [wed, fri], 9, 0, 10, 0);
  addSlots("Aerial Fitness", [sat, sun], 8, 0, 9, 0);
  addSlots("Aerial Fitness", [sat, sun], 9, 0, 10, 0);
  addSlots("Aerial Hoop & Silk", [tue, thu], 9, 0, 10, 0);
  addSlots("Aerial Hoop & Silk", [sat, sun], 12, 0, 13, 0);
  addSlots("Kids Aerial Fitness", [mon, fri], 16, 0, 17, 0);
  addSlots("Kids Aerial Fitness", [tue, thu], 17, 0, 18, 0);
  addSlots("Kids Aerial Fitness", [sat, sun], 10, 0, 11, 0, "8-14 yrs");
  addSlots("Kids Aerial Fitness", [sat, sun], 11, 0, 12, 0, "5-7 yrs");
  addSlots("Trampoline Fitness", [mon, wed], 19, 0, 20, 0);
  addSlots("Mat Pilates", [mon, wed, fri], 8, 0, 9, 0);

  await ScheduleSlotModel.insertMany(slotRows);

  const existingUser = await UserModel.findOne({ mobile: "9999977777" });
  if (!existingUser) {
    const user = await UserModel.create({
      name: "Sarah Jenkins",
      mobile: "9999977777",
      gender: "",
      userRole: "ADMIN",
    });
    const userId = user._id.toString();
    const member = await MemberModel.create({
      userId,
      memberType: "Adult",
    });
    const memberId = member._id.toString();

    const aerialPlan = await MembershipPlanModel.findOne({ classTypeId: nameToId["Aerial Fitness"], name: "3 Months" });
    const funcPlan = await MembershipPlanModel.findOne({ classTypeId: nameToId["Functional Training"], name: "Monthly" });

    const expiry1 = new Date();
    expiry1.setDate(expiry1.getDate() + 90);
    const expiry2 = new Date();
    expiry2.setDate(expiry2.getDate() + 30);

    if (aerialPlan) {
      await MembershipModel.create({
        memberId,
        membershipPlanId: aerialPlan._id.toString(),
        sessionsRemaining: 14,
        expiryDate: expiry1,
        carryForward: 0,
      });
    }
    if (funcPlan) {
      await MembershipModel.create({
        memberId,
        membershipPlanId: funcPlan._id.toString(),
        sessionsRemaining: 8,
        expiryDate: expiry2,
        carryForward: 0,
      });
    }
  }

  await AppSettingModel.findByIdAndUpdate(
    "cancellation_window_minutes",
    { $set: { value: "60" } },
    { upsert: true }
  );

  console.log("Database seeded successfully");
}
