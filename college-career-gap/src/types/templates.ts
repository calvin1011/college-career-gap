import { MessageTag } from './index';

export interface PostTemplate {
  id: string;
  label: string;
  description: string;
  template: string;
  tags: MessageTag[];
  requiresExpiration?: boolean; // auto-set expiration date
  defaultExpirationDays?: number;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: 'internship',
    label: 'Internship Opportunity',
    description: 'Post an internship opening',
    template: `New Internship Opportunity!

Company: [Company Name]
Position: [Position Title]
Location: [City, State / Remote]
Duration: [e.g., Summer 2025, 12 weeks]
Deadline: [Application Deadline]
Requirements: [Key requirements]

Apply: [Application Link]

Additional Details:
[Any other relevant information]`,
    tags: ['internship'],
    requiresExpiration: true,
    defaultExpirationDays: 7,
  },
  {
    id: 'job-posting',
    label: 'Full-Time Job',
    description: 'Share a full-time position',
    template: `Job Opening!

Company: [Company Name]
Position: [Job Title]
Salary Range: [If available]
Location: [City, State / Remote]
Start Date: [Expected start date]
Deadline: [Application Deadline]

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Apply: [Application Link]

Benefits/Perks:
[If applicable]`,
    tags: ['full-time'],
    requiresExpiration: true,
    defaultExpirationDays: 7,
  },
  {
    id: 'event',
    label: 'Career Event',
    description: 'Announce a career-related event',
    template: `Upcoming Career Event!

Event Name: [Event Title]
Date: [Date]
Time: [Start Time - End Time]
Location: [Physical Location / Virtual Link]
Host: [Hosting Organization]

Description:
[What the event is about]

Who Should Attend:
[Target audience]

Register: [Registration Link]
Deadline: [Registration deadline if applicable]`,
    tags: ['event'],
    requiresExpiration: true,
    defaultExpirationDays: 7,
  },
  {
    id: 'scholarship',
    label: 'Scholarship',
    description: 'Share scholarship opportunity',
    template: `Scholarship Opportunity!

Scholarship Name: [Name]
Amount: [Dollar amount]
Eligibility: [Who can apply]
Deadline: [Application Deadline]

Requirements:
- [Requirement 1]
- [Requirement 2]

Apply: [Application Link]

Additional Information:
[Any other details]`,
    tags: ['scholarship'],
    requiresExpiration: true,
    defaultExpirationDays: 7,
  },
  {
    id: 'podcast',
    label: 'Podcast Recommendation',
    description: 'Share a career podcast',
    template: `Recommended Podcast

Title: [Podcast Name]
Episode: [Specific episode or "Series"]
Host: [Host name]

Why You Should Listen:
[Brief description of why this is valuable]

Topics Covered:
- [Topic 1]
- [Topic 2]
- [Topic 3]

Listen: [Link to podcast]

My Key Takeaway:
[Your thoughts]`,
    tags: ['podcast'],
    requiresExpiration: false,
  },
  {
    id: 'career-tip',
    label: 'Career Advice',
    description: 'Share quick career tip',
    template: `Career Tip

Topic: [What this tip is about]

The Advice:
[Your career advice or tip]

Why This Matters:
[Context or explanation]

Action Steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Resources:
[Any helpful links or materials]`,
    tags: ['advice-tip'],
    requiresExpiration: false,
  },
  {
    id: 'resource',
    label: 'Learning Resource',
    description: 'Share educational content',
    template: `Helpful Resource

Resource: [Name of resource]
Type: [Course / Article / Tool / Book]
Provider: [Organization or Author]

What It Offers:
[Brief description]

Best For:
[Who would benefit most]

Access: [Link or how to access]
Cost: [Free / Paid / Student Discount Available]`,
    tags: ['advice-tip'],
    requiresExpiration: false,
  },
  {
    id: 'blank',
    label: 'Blank Post',
    description: 'Start from scratch',
    template: '',
    tags: [],
    requiresExpiration: false,
  },
];