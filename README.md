# College Career Gap

A Progressive Web Application designed to bridge the gap between classroom learning and career preparation at Adams State University. The platform connects professors and students through major-specific channels where faculty can share curated career resources, job postings, internships, and professional guidance.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Key Functionalities](#key-functionalities)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Overview

College Career Gap addresses the challenge of connecting students with relevant career resources by providing a centralized platform where professors can directly share opportunities and guidance with students in their major. The system is built to be simple, focused, and effective.

**Problem Solved**: Students at smaller universities often struggle to find career resources specific to their major, and professors lack an easy way to share opportunities with their students in a targeted manner.

**Solution**: A major-specific resource hub that enables direct, focused communication between professors and students about career opportunities.

## Features

### For Students
- Access to major-specific career resources and job postings
- Real-time notifications for new opportunities
- Ability to filter resources by concentration within their major
- Support for dual majors with easy channel switching
- Message reactions and engagement tracking
- Progressive Web App capabilities for mobile installation

### For Professors
- Post job opportunities, internships, and career advice
- Tag messages with categories (internship, full-time, event, podcast, advice)
- Set custom expiration dates for time-sensitive posts
- Target specific concentrations within a major
- Pin important messages
- Track student engagement (views, clicks)
- Manage major concentrations dynamically

### Administrative Features
- Automated cleanup of expired posts (runs daily at 2 AM)
- Feedback system for gathering user input
- Cleanup logs and analytics
- Concentration management per major
- Super admin controls

## Technology Stack

### Frontend
- **Next.js 15.5.2** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Firebase Authentication** - User management
- **Firestore** - Real-time database
- **Firebase Cloud Functions** - Serverless functions
- **Firebase Cloud Messaging** - Push notifications
- **Firebase Storage** - File storage

### Development Tools
- **ESLint** - Code linting
- **Vercel** - Deployment platform

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/college-career-gap.git
cd college-career-gap
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Create `.env.local` for development:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Create `.env.production` for production with production Firebase credentials.

4. Generate the service worker
```bash
npm run generate-sw
```

5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
college-career-gap/
├── public/                          # Static assets
│   ├── firebase-messaging-sw.js     # Service worker (generated)
│   └── manifest.json                # PWA manifest
├── src/
│   ├── app/                         # Next.js app directory
│   │   ├── dashboard/               # Dashboard pages
│   │   │   ├── admin/              # Admin-only pages
│   │   │   ├── channels/           # Channel pages
│   │   │   └── profile/            # Profile settings
│   │   ├── api/                    # API routes
│   │   └── layout.tsx              # Root layout
│   ├── components/                  # React components
│   │   ├── auth/                   # Authentication components
│   │   ├── channels/               # Channel-related components
│   │   ├── feedback/               # Feedback modal
│   │   ├── layout/                 # Layout components
│   │   └── ui/                     # Reusable UI components
│   ├── contexts/                    # React contexts
│   │   └── AuthContext.tsx         # Authentication context
│   ├── functions/                   # Firebase Cloud Functions
│   │   └── index.js                # Function definitions
│   ├── hooks/                       # Custom React hooks
│   ├── services/                    # Service layer
│   │   └── firebase/               # Firebase configuration
│   ├── types/                       # TypeScript type definitions
│   └── utils/                       # Utility functions
├── scripts/                         # Build scripts
│   ├── generate-sw.js              # Service worker generator
│   └── setup-git-hooks.js          # Git hooks setup
└── seed.mjs                        # Database seeding script
```

## Key Functionalities

### Channel System
Each supported major has its own channel:
- Business
- Computer Science
- Biology
- Chemistry
- Psychology
- Kinesiology
- Nursing
- Mechanical Engineering
- School of Education

Channels support optional sub-channels (concentrations) that can be managed by administrators.

### Message Types
- **Text Messages**: General announcements and advice
- **Link Messages**: Automatically generates rich previews
- **Tagged Messages**: Categorized with tags like internship, full-time, event, etc.

### Expiration System
Messages tagged as internship, full-time, or event automatically expire after 7 days (customizable). The system:
- Shows countdown badges to students
- Automatically removes expired posts at 2 AM daily
- Logs all cleanup operations for admin review

### Notification System
- Push notifications for new messages
- Per-device notification token management
- Students can toggle notifications on/off per device
- Notifications only sent to active channel members

### Analytics
- View tracking (students only)
- Click tracking for links (students only)
- Reaction tracking
- Admin dashboard with engagement metrics

## Configuration

### Adding New Majors
1. Add major to `SUPPORTED_MAJORS` in `src/types/index.ts`
2. Run the seed script: `node seed.mjs`
3. Configure concentrations via admin panel if needed

### Super Admin Configuration
Edit `src/config/superAdmin.ts`:
```typescript
export const SUPER_ADMIN_EMAILS = [
  'admin@example.edu',
  // Add more super admin emails
];
```

### Firebase Rules
The project includes comprehensive Firestore security rules. Deploy them with:
```bash
firebase deploy --only firestore:rules
```

### Cloud Functions
Deploy Cloud Functions with:
```bash
cd src/functions
npm install
firebase deploy --only functions
```

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Firebase Setup
1. Initialize Firebase in your project directory
2. Deploy Firestore rules and indexes
3. Deploy Cloud Functions
4. Set up Firebase Cloud Messaging

### Post-Deployment
1. Verify service worker is properly generated
2. Test push notifications
3. Run initial database seed
4. Configure cleanup schedule

## Contributing

### Development Workflow
1. Create a feature branch
2. Make changes and test locally
3. Ensure all tests pass
4. Submit pull request with description

### Code Style
- Follow existing TypeScript and React patterns
- Use functional components with hooks
- Implement proper error handling
- Write meaningful commit messages

### Testing
- Test on multiple browsers (Chrome, Safari, Firefox)
- Verify mobile responsiveness
- Test PWA installation
- Verify push notifications work

## License

This project is built for Adams State University as an educational tool to support student career development.

## Contact

For questions or support, contact: calvinssendawula@gmail.com

## Acknowledgments

Built by Calvin Ssendawula as a Computer Science senior project at Adams State University.
