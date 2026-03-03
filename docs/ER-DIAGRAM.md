# Airborne Fitness – Entity Relationship Diagram

Mermaid ER diagram of the MongoDB/Mongoose models (matches `shared/schema.ts`).

```mermaid
erDiagram
  User {
    string id PK
    string name
    string mobile UK
    string gender
    string userRole
    date createdAt
  }

  Member {
    string id PK
    string userId FK
    string memberType
    string name
    string dob
    string gender
    string email
    string emergencyContactName
    string emergencyContactPhone
    string medicalConditions
    date createdAt
  }

  ClassType {
    string id PK
    string name UK
    string ageGroup
    int strengthLevel
    string[] infoBullets
    boolean isActive
  }

  MembershipPlan {
    string id PK
    string classTypeId FK
    string name
    int sessionsTotal
    int validityDays
    int price
    boolean isActive
  }

  ScheduleSlot {
    string id PK
    string classTypeId FK
    string branch
    int dayOfWeek
    int startHour
    int startMinute
    int endHour
    int endMinute
    int capacity
    boolean isActive
    string notes
  }

  Membership {
    string id PK
    string memberId FK
    string membershipPlanId FK
    int sessionsRemaining
    date expiryDate
    int carryForward
    date extensionRequestedAt
    date extensionApprovedAt
    boolean extensionApplied
    date createdAt
  }

  Booking {
    string id PK
    string memberId FK
    string scheduleId FK
    string sessionDate
    string status
    int waitlistPosition
    date createdAt
  }

  WaiverSignature {
    string id PK
    string userId FK
    string signatureName
    boolean agreedTerms
    boolean agreedAge
    date createdAt
  }

  AppSetting {
    string key PK
    string value
  }

  User ||--o{ Member : "has"
  User ||--o{ WaiverSignature : "signs"
  ClassType ||--o{ MembershipPlan : "has plans"
  ClassType ||--o{ ScheduleSlot : "has slots"
  Member ||--o{ Membership : "has"
  Member ||--o{ Booking : "makes"
  MembershipPlan ||--o{ Membership : "purchased as"
  ScheduleSlot ||--o{ Booking : "scheduled in"
```

## Relationships

| From          | To              | Cardinality | Description                                      |
|---------------|-----------------|-------------|--------------------------------------------------|
| User          | Member          | 1 : N       | One user (account) can have multiple members (e.g. Adult + Kid) |
| User          | WaiverSignature | 1 : N       | One user signs waiver(s)                          |
| ClassType     | MembershipPlan  | 1 : N       | One class type has many membership plans          |
| ClassType     | ScheduleSlot    | 1 : N       | One class type has many weekly schedule slots     |
| Member        | Membership      | 1 : N       | One member can have many memberships             |
| MembershipPlan| Membership      | 1 : N       | A plan can be purchased by many members          |
| Member        | Booking         | 1 : N       | One member can have many bookings                |
| ScheduleSlot  | Booking         | 1 : N       | One slot (per sessionDate) can have many bookings |

## Collections (MongoDB)

Mongoose model names are lowercased and pluralized:

- `users` – User
- `members` – Member
- `classtypes` – ClassType
- `membershipplans` – MembershipPlan
- `scheduleslots` – ScheduleSlot
- `memberships` – Membership
- `bookings` – Booking
- `waiversignatures` – WaiverSignature
- `appsettings` – AppSetting
