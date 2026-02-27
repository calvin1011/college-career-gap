import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

const projectId = 'college-career-gap-prod';

if (projectId === 'your-project-id-here') {
    console.error(" Error: Please replace 'your-project-id-here' with your actual PRODUCTION Firebase Project ID.");
    process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: projectId,
});

const db = admin.firestore();
console.log(`Firebase Admin SDK initialized for project: ${projectId}`);

const SUPPORTED_MAJORS = [
  'Mechanical Engineering',
  'School of Education',
  'Business',
  'Computer Science',
  'Biology',
  'Chemistry',
  'Psychology',
  'Kinesiology',
  'Nursing',
  'Math'
];

// SEED MESSAGES (from ChannelService.ts)
const SEED_MESSAGES = {
    'Mechanical Engineering': [
        { content: "Welcome to the Business channel! ⚙️ This is where you'll find career resources, internship opportunities, and networking tips for business students.", type: 'text', isPinned: true },
        { content: "Check out these essential business podcasts: Harvard Business Review IdeaCast, Masters in Business by Bloomberg, and The McKinsey Podcast. Great for staying current with industry trends!", type: 'text', isPinned: false },
        { content: "LinkedIn Learning has excellent courses on Excel, PowerPoint, and business analytics. Your .edu email gives you free access!", type: 'text', isPinned: false }
    ],
    'School of Education': [
        { content: "Welcome to the Business channel! 📚 This is where you'll find career resources, internship opportunities, and networking tips for business students.", type: 'text', isPinned: true },
        { content: "Check out these essential business podcasts: Harvard Business Review IdeaCast, Masters in Business by Bloomberg, and The McKinsey Podcast. Great for staying current with industry trends!", type: 'text', isPinned: false },
        { content: "LinkedIn Learning has excellent courses on Excel, PowerPoint, and business analytics. Your .edu email gives you free access!", type: 'text', isPinned: false }
    ],
    'Business': [
        { content: "Welcome to the Business channel! 🏢 This is where you'll find career resources, internship opportunities, and networking tips for business students.", type: 'text', isPinned: true },
        { content: "Check out these essential business podcasts: Harvard Business Review IdeaCast, Masters in Business by Bloomberg, and The McKinsey Podcast. Great for staying current with industry trends!", type: 'text', isPinned: false },
        { content: "LinkedIn Learning has excellent courses on Excel, PowerPoint, and business analytics. Your .edu email gives you free access!", type: 'text', isPinned: false }
    ],
    'Computer Science': [
        { content: "Welcome to Computer Science! 💻 Here you'll find programming resources, tech job opportunities, and industry insights to boost your career.", type: 'text', isPinned: true },
        { content: "Must-follow tech podcasts: Software Engineering Daily, CodeNewbie Podcast, and The Changelog. Perfect for your commute or study breaks!", type: 'text', isPinned: false },
        { content: "Free coding practice: LeetCode, HackerRank, and Codewars. Start with easy problems and work your way up. Consistency beats perfection!", type: 'text', isPinned: false }
    ],
    'Biology': [
        { content: "Welcome to Biology! 🧬 Discover research opportunities, graduate school tips, and career paths in the life sciences.", type: 'text', isPinned: true },
        { content: "Great science podcasts: Nature Podcast, Science Magazine Podcast, and Radiolab. Stay curious and keep learning!", type: 'text', isPinned: false },
        { content: "Research experience is crucial! Check UREC (Undergraduate Research Experience Center) and talk to professors about lab opportunities.", type: 'text', isPinned: false }
    ],
    'Chemistry': [
        { content: "Welcome to Chemistry! ⚗️ Find lab opportunities, graduate school advice, and career resources in chemical sciences.", type: 'text', isPinned: true },
        { content: "Chemistry careers extend far beyond academia! Consider pharmaceutical companies, materials science, environmental consulting, and forensics.", type: 'text', isPinned: false }
    ],
    'Psychology': [
        { content: "Welcome to Psychology! 🧠 Explore research opportunities, graduate school preparation, and diverse career paths in psychology.", type: 'text', isPinned: true },
        { content: "Psychology careers are diverse: clinical psychology, research, HR, UX design, marketing, and social work. Keep an open mind about possibilities!", type: 'text', isPinned: false }
    ],
    'Kinesiology': [
        { content: "Welcome to Kinesiology! 🏃‍♂️ Discover opportunities in sports medicine, physical therapy, fitness, and health promotion.", type: 'text', isPinned: true },
        { content: "Consider these career paths: physical therapy, athletic training, occupational therapy, sports psychology, and health coaching.", type: 'text', isPinned: false }
    ],
    'Nursing': [
        { content: "Welcome to Nursing! 🩺 Find clinical opportunities, licensing information, and career guidance for nursing students.", type: 'text', isPinned: true },
        { content: "Explore nursing specialties: pediatrics, emergency care, mental health, community health, and nurse practitioner pathways.", type: 'text', isPinned: false }
    ],
    'Math': [
        { content: "Welcome to Math! ➕ Discover career paths in academia, data science, actuarial science, finance, and more.", type: 'text', isPinned: true },
        { content: "Math opens many doors: consider actuarial exams, quantitative finance, cryptography, machine learning, and operations research.", type: 'text', isPinned: false },
        { content: "AMC, Putnam, and research experiences strengthen your profile. Reach out to professors for research and teaching opportunities.", type: 'text', isPinned: false }
    ]
}; //

// Seeding Logic
async function createSeedMessages(channelId, channelName, transaction) {
  const messagesForMajor = SEED_MESSAGES[channelName];
  if (!messagesForMajor) return 0;

  const messagesRef = db.collection('messages');
  for (const messageData of messagesForMajor) {
    const newMessage = {
      ...messageData,
      channelId,
      authorId: 'system',
      reactions: {},
      isEdited: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { tags: ['welcome', 'resources'] }
    };
    transaction.set(messagesRef.doc(), newMessage);
  }
  return messagesForMajor.length;
}

async function seedChannels() {
  console.log('Starting channel seeding process...');
  const channelsRef = db.collection('channels');

  for (const major of SUPPORTED_MAJORS) {
    const slug = major.toLowerCase().replace(/\s/g, '-');
    const channelDocRef = channelsRef.doc(slug);
    const channelDoc = await channelDocRef.get();

    if (!channelDoc.exists) {
      console.log(`\t- Creating channel for ${major}...`);
      await db.runTransaction(async (transaction) => {
        const messageCount = await createSeedMessages(slug, major, transaction);

        const newChannel = {
          name: major,
          slug,
          description: `Career resources and guidance for ${major} students.`,
          majorCode: major.split(' ').map(w => w[0]).join('').toUpperCase(),
          color: '#3B82F6',
          admins: [],
          memberCount: 0,
          messageCount: messageCount,
          inviteCode: `${major.split(' ').map(w => w[0]).join('').toUpperCase()}_INVITE`,
          settings: { allowReactions: true, maxMessageLength: 2000, autoModeration: false },
          members: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(channelDocRef, newChannel);
      });
      console.log(`\t Channel and messages for ${major} created.`);
    } else {
      console.log(`\t- Channel for ${major} already exists, skipping.`);
    }
  }
  console.log(' Seeding process complete!');
}

seedChannels().catch(console.error);