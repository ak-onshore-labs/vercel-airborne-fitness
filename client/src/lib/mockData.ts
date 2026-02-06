import { addDays, startOfDay } from "date-fns";

export type ClassCategory = 
  | 'Pilates & Mobility' 
  | 'Kids Advance Aerial' 
  | 'Aerial Hoop & Silk' 
  | 'Aerial Fitness' 
  | 'Kids Aerial Fitness' 
  | 'Functional Training';

export interface ClassType {
  id: string;
  name: ClassCategory;
  description: string;
  ageGroup: string;
  image: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validityDays?: number;
}

export interface ClassSession {
  id: string;
  classId: string;
  startTime: Date;
  endTime: Date;
  totalSpots: number;
  bookedSpots: number;
}

export const CLASSES: ClassType[] = [
  {
    id: 'pilates',
    name: 'Pilates & Mobility',
    description: 'Improve flexibility, core strength, and body awareness.',
    ageGroup: 'Adults',
    image: 'pilates_reformer_studio_bright_minimal.png' 
  },
  {
    id: 'aerial-fitness',
    name: 'Aerial Fitness',
    description: 'Full body workout using aerial hammocks. Build strength and grace.',
    ageGroup: 'Adults',
    image: 'cinematic_aerial_silks_fitness_studio_dark_moody.png'
  },
  {
    id: 'aerial-hoop',
    name: 'Aerial Hoop & Silk',
    description: 'Artistic aerial skills on hoop and silks.',
    ageGroup: 'Adults',
    image: 'aerial_hoop_silhouette_artistic.png'
  },
  {
    id: 'functional',
    name: 'Functional Training',
    description: 'High intensity interval training for endurance and strength.',
    ageGroup: 'Adults',
    image: 'cinematic_aerial_silks_fitness_studio_dark_moody.png'
  },
  {
    id: 'kids-aerial',
    name: 'Kids Aerial Fitness',
    description: 'Fun and safe aerial introduction for kids.',
    ageGroup: 'Kids 5-14',
    image: 'cinematic_aerial_silks_fitness_studio_dark_moody.png'
  }
];

export const MEMBERSHIP_PLANS: Record<string, MembershipPlan[]> = {
  'Aerial Fitness': [
    { id: 'af-walkin', name: 'Walk-in', sessions: 1, price: 1000, validityDays: 7 },
    { id: 'af-4', name: '4 Sessions', sessions: 4, price: 3000, validityDays: 30 },
    { id: 'af-8', name: '8 Sessions', sessions: 8, price: 5500, validityDays: 45 },
    { id: 'af-24', name: '24 Sessions', sessions: 24, price: 15500, validityDays: 90 },
    { id: 'af-48', name: '48 Sessions', sessions: 48, price: 30000, validityDays: 180 },
    { id: 'af-96', name: '96 Sessions', sessions: 96, price: 58000, validityDays: 365 },
  ],
  'Pilates & Mobility': [
    { id: 'pm-walkin', name: 'Walk-in', sessions: 1, price: 1000, validityDays: 7 },
    { id: 'pm-8', name: '8 Sessions', sessions: 8, price: 5000, validityDays: 45 },
    { id: 'pm-12', name: '12 Sessions', sessions: 12, price: 7500, validityDays: 60 },
  ],
  'Kids Advance Aerial': [
    { id: 'ka-walkin', name: 'Walk-in', sessions: 1, price: 1000, validityDays: 7 },
    { id: 'ka-8', name: 'Monthly (8 Sessions)', sessions: 8, price: 7000, validityDays: 30 },
    { id: 'ka-24', name: '3 Months (24 Sessions)', sessions: 24, price: 20000, validityDays: 90 },
  ],
  'Aerial Hoop & Silk': [
    { id: 'ah-walkin', name: 'Walk-in', sessions: 1, price: 1000, validityDays: 7 },
    { id: 'ah-8', name: '8 Sessions', sessions: 8, price: 7000, validityDays: 30 },
    { id: 'ah-24', name: '24 Sessions', sessions: 24, price: 20000, validityDays: 90 },
  ],
  'Kids Aerial Fitness': [
    { id: 'kf-walkin', name: 'Walk-in', sessions: 1, price: 1000, validityDays: 7 },
    { id: 'kf-8', name: '8 Sessions', sessions: 8, price: 6000, validityDays: 30 },
    { id: 'kf-24', name: '24 Sessions', sessions: 24, price: 17000, validityDays: 90 },
    { id: 'kf-48', name: '48 Sessions', sessions: 48, price: 33000, validityDays: 180 },
    { id: 'kf-96', name: '96 Sessions', sessions: 96, price: 64000, validityDays: 365 },
  ],
  'Functional Training': [
    { id: 'ft-walkin', name: 'Walk-in', sessions: 1, price: 1000, validityDays: 7 },
    { id: 'ft-12', name: '12 Sessions', sessions: 12, price: 5000, validityDays: 45 },
    { id: 'ft-36', name: '36 Sessions', sessions: 36, price: 13500, validityDays: 120 },
    { id: 'ft-72', name: '72 Sessions', sessions: 72, price: 27000, validityDays: 240 },
    { id: 'ft-144', name: '144 Sessions', sessions: 144, price: 50000, validityDays: 365 },
  ],
  'default': [
    { id: 'def-walkin', name: 'Walk-in', sessions: 1, price: 1000, validityDays: 7 },
  ]
};

// Generate Mock Schedule for next 7 days
const TODAY = startOfDay(new Date());

export const MOCK_SCHEDULE: ClassSession[] = [];

[0, 1, 2, 3, 4, 5, 6].forEach(dayOffset => {
  const date = addDays(TODAY, dayOffset);
  
  MOCK_SCHEDULE.push({
    id: `session-${dayOffset}-1`,
    classId: 'aerial-fitness',
    startTime: new Date(new Date(date).setHours(8, 0, 0, 0)),
    endTime: new Date(new Date(date).setHours(9, 0, 0, 0)),
    totalSpots: 14,
    bookedSpots: 8 + dayOffset 
  });

  MOCK_SCHEDULE.push({
    id: `session-${dayOffset}-2`,
    classId: 'pilates',
    startTime: new Date(new Date(date).setHours(9, 30, 0, 0)),
    endTime: new Date(new Date(date).setHours(10, 30, 0, 0)),
    totalSpots: 10,
    bookedSpots: 10 
  });

  MOCK_SCHEDULE.push({
    id: `session-${dayOffset}-3`,
    classId: 'kids-aerial',
    startTime: new Date(new Date(date).setHours(16, 0, 0, 0)),
    endTime: new Date(new Date(date).setHours(17, 0, 0, 0)),
    totalSpots: 12,
    bookedSpots: 5
  });

  MOCK_SCHEDULE.push({
    id: `session-${dayOffset}-4`,
    classId: 'aerial-hoop',
    startTime: new Date(new Date(date).setHours(18, 0, 0, 0)),
    endTime: new Date(new Date(date).setHours(19, 0, 0, 0)),
    totalSpots: 8,
    bookedSpots: 2
  });
  
  MOCK_SCHEDULE.push({
    id: `session-${dayOffset}-5`,
    classId: 'functional',
    startTime: new Date(new Date(date).setHours(19, 30, 0, 0)),
    endTime: new Date(new Date(date).setHours(20, 30, 0, 0)),
    totalSpots: 20,
    bookedSpots: 15
  });
});
