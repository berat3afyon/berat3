# Overview

This is a full-stack academic study management application designed for Turkish university entrance exams (TYT/AYT). The application helps students track their progress, analyze performance, manage tasks, and optimize their study routines through comprehensive analytics and visualizations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Theme System**: Custom theme provider supporting light/dark modes

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Validation**: Zod for runtime type validation and schema parsing
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

## Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon Database
- **ORM**: Drizzle ORM with TypeScript integration
- **Schema Organization**: Shared schema definitions between client and server
- **Migration Strategy**: Drizzle Kit handles schema migrations and deployments

## Key Data Models
- **Tasks**: Academic task management with categories, priorities, and recurrence
- **Question Logs**: Detailed tracking of practice questions by subject and topic
- **Exam Results**: TYT/AYT exam performance tracking with net scores
- **Moods**: Daily mood and note tracking for wellbeing insights
- **Goals**: Academic goal setting with progress tracking
- **Flashcards**: Spaced repetition system for active recall

## Authentication and Authorization
- **Session-based Authentication**: Using Express sessions stored in PostgreSQL
- **No JWT Implementation**: Relies on server-side session management
- **Simple Authorization**: Basic session validation for API endpoints

## API Architecture
- **REST Design**: Express.js routes organized by resource type
- **Error Handling**: Global error middleware with structured error responses
- **Request Validation**: Zod schemas validate incoming request data
- **Response Format**: Consistent JSON responses with proper HTTP status codes

## Analytics and Visualization
- **Charts**: Recharts library for performance analytics and progress visualization
- **Real-time Updates**: React Query provides optimistic updates and background refetching
- **Data Aggregation**: Server-side calculations for study metrics and topic analysis
- **Performance Tracking**: Comprehensive analytics for exam preparation insights

## Development and Build
- **Development Server**: Vite with HMR and custom middleware integration
- **Build Process**: Vite for frontend, esbuild for backend bundling
- **TypeScript**: Full type safety across client, server, and shared modules
- **Path Aliases**: Configured for clean imports and better developer experience

# External Dependencies

## Core Database
- **Neon Database**: Serverless PostgreSQL hosting platform
- **Connection**: @neondatabase/serverless driver for database connectivity

## UI and Design
- **Radix UI**: Headless UI components for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Chart library for data visualization and analytics

## Development Tools
- **Replit Integration**: Vite plugins for development environment integration
- **Runtime Error Handling**: @replit/vite-plugin-runtime-error-modal for debugging

## Form Management
- **React Hook Form**: Form state management and validation
- **@hookform/resolvers**: Zod integration for form validation

## Date and Time
- **date-fns**: Date manipulation and formatting utilities

## Query and State
- **TanStack React Query**: Server state management, caching, and synchronization

## Weather Integration
- **External Weather API**: Real-time weather data for enhanced user experience (implementation details in weather widget components)

The application uses a modern, type-safe stack optimized for academic performance tracking with real-time updates, comprehensive analytics, and a responsive user interface designed for Turkish university exam preparation.