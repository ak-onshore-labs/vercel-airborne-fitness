# Airborne Fitness - Member-Facing Web App

## Overview

Airborne Fitness is a mobile-first, member-facing web application for an aerial fitness studio in Mumbai. It allows members to log in via phone number, view their memberships, book class sessions across multiple branches (Lower Parel, Mazgaon), manage bookings with waitlist support, and enroll in new membership plans. The app features a demo mode with hardcoded phone numbers (`9999977777` for existing members, `9999988888` for new members) that fork the user journey accordingly.

The application is a full-stack TypeScript project with a React SPA frontend served by an Express backend, backed by a PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript (no SSR, pure SPA)
- **Routing**: Wouter (lightweight client-side router) — NOT React Router or Next.js
- **State Management**: React Context (`MemberContext`) for user state, bookings, branch selection, and session management
- **Data Fetching**: TanStack React Query for server state, with a custom `apiRequest` helper in `client/src/lib/queryClient.ts`
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, Tailwind CSS v4 with custom theme variables
- **Animations**: Framer Motion for page transitions and UI animations
- **Styling**: Tailwind CSS with custom brand colors (`airborne-teal`, `airborne-aqua`, `airborne-deep`, etc.) defined in `client/src/index.css`. Uses Poppins font. Mobile-first design with `max-w-md` centered layout
- **Build Tool**: Vite with React plugin and Tailwind CSS plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`

### Key Frontend Pages
- `/login` — Phone + OTP login (OTP is simulated)
- `/dashboard` — Member home with membership cards and today's bookings
- `/book` — Rolling 7-day class schedule with booking/waitlist functionality
- `/enroll` — Multi-step enrollment flow (personal details, plan selection, waiver, payment simulation)
- `/sessions` — View and manage booked sessions, cancel bookings
- `/profile` — Member profile and logout

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript, executed via `tsx` in development
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Key Endpoints**: `/api/login`, `/api/members/:id`, `/api/schedule`, `/api/bookings`, `/api/enroll`, `/api/memberships`
- **Build**: esbuild bundles server to `dist/index.cjs` for production; Vite builds client to `dist/public/`
- **Dev Server**: Vite dev server runs as middleware inside Express (see `server/vite.ts`)
- **Static Serving**: In production, Express serves built files from `dist/public/` with SPA fallback

### Database Layer
- **Database**: PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema Location**: `shared/schema.ts` — shared between client and server
- **Migrations**: Generated via `drizzle-kit push` (config in `drizzle.config.ts`, output to `./migrations`)
- **Key Tables**:
  - `members` — User profiles (phone, name, email, emergency contact, medical info)
  - `memberships` — Active membership plans per member (category, sessions remaining, expiry)
  - `class_schedule` — Weekly recurring class schedule (day of week, time, branch, capacity of 14)
  - `bookings` — Session bookings with status enum (BOOKED, WAITLISTED, CANCELLED)
  - `waiver_signatures` — Liability waiver records
  - `kid_details` — Details for kids' class enrollments
- **Seeding**: `server/seed.ts` populates class schedules for all 7 days across both branches, and creates a demo existing member with pre-loaded memberships
- **Storage Pattern**: `IStorage` interface in `server/storage.ts` with `DatabaseStorage` implementation using Drizzle queries

### Design Patterns
- Shared schema types between frontend and backend via the `shared/` directory
- The frontend uses the `MemberContext` provider to manage all user state, bookings, and branch selection globally
- Session capacity is always 14; waitlist and slot availability are tracked per session instance
- Branch filtering (Lower Parel / Mazgaon) is a top-level toggle in the booking flow

## External Dependencies

### Required Services
- **PostgreSQL Database**: Connected via `DATABASE_URL` environment variable. Used for all persistent data storage. Required for the app to start.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** + **drizzle-zod**: Database ORM, migrations, and schema validation
- **express**: HTTP server framework
- **pg** + **connect-pg-simple**: PostgreSQL client and session store
- **@tanstack/react-query**: Server state management on the client
- **wouter**: Lightweight client-side routing
- **framer-motion**: Animation library
- **date-fns**: Date manipulation utilities
- **zod**: Runtime schema validation
- **shadcn/ui ecosystem**: Radix UI primitives, class-variance-authority, clsx, tailwind-merge
- **embla-carousel-react**: Carousel component
- **react-day-picker**: Calendar component
- **vaul**: Drawer component
- **input-otp**: OTP input component

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling (dev only)
- `@replit/vite-plugin-dev-banner`: Development banner (dev only)
- Custom `vite-plugin-meta-images`: Updates OpenGraph meta tags with Replit deployment URL

### No External API Integrations
- Firebase/Razorpay are mentioned in design docs but are NOT connected — all payment and auth flows are simulated on the frontend
- OTP verification is fake (any 4+ digit code works)
- SMS is not sent — the flow is purely UI-based