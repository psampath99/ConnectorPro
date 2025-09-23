import { Contact, User, Commonality, Bridge, Recommendation, Draft, Task, Meeting, Activity } from '@/types';

export const mockUser: User = {
  id: 'user-1',
  email: 'maya@example.com',
  name: 'Maya Chen',
  role: 'job_seeker',
  createdAt: new Date('2024-01-01'),
  preferences: {
    commonalityOrder: ['employer', 'education', 'mutual', 'event'],
    draftTone: 'professional',
    reminderFrequency: 7
  }
};

export const mockCommonalities: Commonality[] = [
  {
    id: 'comm-1',
    type: 'employer',
    description: 'Both worked at Google',
    evidence: 'Google Ads team, 2019-2021 overlap',
    confidence: 0.95,
    timeframe: '2019-2021'
  },
  {
    id: 'comm-2',
    type: 'education',
    description: 'UCLA Alumni',
    evidence: 'Both graduated UCLA 2018, Marketing Club members',
    confidence: 0.9,
    timeframe: '2018'
  },
  {
    id: 'comm-3',
    type: 'mutual',
    description: 'Mutual connection: Alex Kumar',
    evidence: 'Both connected to Alex Kumar (ex-Google colleague)',
    confidence: 0.85
  },
  {
    id: 'comm-4',
    type: 'event',
    description: 'RevOps Collective member',
    evidence: 'Both active in RevOps Collective community',
    confidence: 0.8
  },
  {
    id: 'comm-5',
    type: 'employer',
    description: 'Both worked at Meta',
    evidence: 'Alex and David both work at Meta, same product org',
    confidence: 0.9,
    timeframe: '2022-present'
  },
  {
    id: 'comm-6',
    type: 'education',
    description: 'Stanford Alumni',
    evidence: 'Both graduated Stanford, Computer Science program',
    confidence: 0.92,
    timeframe: '2017'
  },
  {
    id: 'comm-7',
    type: 'employer',
    description: 'Both worked at Stripe',
    evidence: 'Former Stripe colleagues, product team',
    confidence: 0.88,
    timeframe: '2020-2022'
  },
  {
    id: 'comm-8',
    type: 'mutual',
    description: 'Mutual connection: Sarah Chen',
    evidence: 'Both connected to Sarah Chen from Stripe',
    confidence: 0.83
  },
  {
    id: 'comm-9',
    type: 'event',
    description: 'ProductCon attendee',
    evidence: 'Both attended ProductCon 2023, spoke at same panel',
    confidence: 0.87
  },
  {
    id: 'comm-10',
    type: 'employer',
    description: 'Both worked at Airbnb',
    evidence: 'Former Airbnb colleagues, growth team',
    confidence: 0.91,
    timeframe: '2021-2023'
  },
  {
    id: 'comm-11',
    type: 'education',
    description: 'Berkeley Alumni',
    evidence: 'Both graduated UC Berkeley, Business School',
    confidence: 0.88,
    timeframe: '2019'
  },
  {
    id: 'comm-12',
    type: 'event',
    description: 'TechCrunch Disrupt attendee',
    evidence: 'Both attended TechCrunch Disrupt 2023',
    confidence: 0.75
  },
  {
    id: 'comm-13',
    type: 'employer',
    description: 'Both worked at Microsoft',
    evidence: 'Former Microsoft colleagues, Azure team',
    confidence: 0.89,
    timeframe: '2018-2020'
  },
  {
    id: 'comm-14',
    type: 'mutual',
    description: 'Mutual connection: Lisa Wang',
    evidence: 'Both connected to Lisa Wang from Google',
    confidence: 0.82
  },
  {
    id: 'comm-15',
    type: 'event',
    description: 'Y Combinator Demo Day attendee',
    evidence: 'Both attended YC Demo Day events',
    confidence: 0.78
  }
];

export const mockContacts: Contact[] = [
  // 1st Degree Bridge Contacts
  {
    id: 'contact-2',
    name: 'Alex Kumar',
    title: 'Product Manager',
    company: 'Meta',
    email: 'alex.kumar@meta.com',
    linkedinUrl: 'https://linkedin.com/in/alexkumar',
    degree: 1,
    relationshipStrength: 'strong',
    commonalities: [mockCommonalities[0]],
    notes: 'Ex-Google colleague, great bridge contact',
    tags: ['meta', 'bridge', 'ex-google'],
    addedAt: new Date('2024-01-10'),
    lastInteraction: new Date('2024-01-25')
  },
  {
    id: 'contact-4',
    name: 'Priya Patel',
    title: 'Marketing Director',
    company: 'Airbnb',
    email: 'priya.patel@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/priyapatel',
    degree: 1,
    relationshipStrength: 'strong',
    commonalities: [mockCommonalities[1], mockCommonalities[9]],
    notes: 'UCLA classmate, marketing expert',
    tags: ['airbnb', 'ucla', 'bridge'],
    addedAt: new Date('2024-01-08'),
    lastInteraction: new Date('2024-01-22')
  },
  {
    id: 'contact-7',
    name: 'Lisa Wang',
    title: 'Senior Software Engineer',
    company: 'Google',
    email: 'lisa.wang@google.com',
    linkedinUrl: 'https://linkedin.com/in/lisawang',
    degree: 1,
    relationshipStrength: 'strong',
    commonalities: [mockCommonalities[0], mockCommonalities[5]],
    notes: 'Current Google colleague, knows many Stripe people',
    tags: ['google', 'bridge', 'engineering'],
    addedAt: new Date('2024-01-05'),
    lastInteraction: new Date('2024-01-23')
  },
  {
    id: 'contact-8',
    name: 'James Thompson',
    title: 'Product Designer',
    company: 'Airbnb',
    email: 'james.thompson@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/jamesthompson',
    degree: 1,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[9]],
    notes: 'Stanford alum, former Stripe designer',
    tags: ['airbnb', 'stanford', 'bridge'],
    addedAt: new Date('2024-01-12'),
    lastInteraction: new Date('2024-01-21')
  },
  {
    id: 'contact-9',
    name: 'Rachel Kim',
    title: 'Growth Marketing Manager',
    company: 'Uber',
    email: 'rachel.kim@uber.com',
    linkedinUrl: 'https://linkedin.com/in/rachelkim',
    degree: 1,
    relationshipStrength: 'strong',
    commonalities: [mockCommonalities[1], mockCommonalities[8]],
    notes: 'UCLA Marketing Club president, knows many Stripe people',
    tags: ['uber', 'ucla', 'bridge'],
    addedAt: new Date('2024-01-14'),
    lastInteraction: new Date('2024-01-24')
  },
  {
    id: 'contact-10',
    name: 'Kevin Park',
    title: 'Engineering Manager',
    company: 'Netflix',
    email: 'kevin.park@netflix.com',
    linkedinUrl: 'https://linkedin.com/in/kevinpark',
    degree: 1,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[3]],
    notes: 'Stanford CS, active in RevOps community',
    tags: ['netflix', 'stanford', 'bridge'],
    addedAt: new Date('2024-01-16'),
    lastInteraction: new Date('2024-01-19')
  },

  // STRIPE - 2nd Degree Contacts (8 contacts)
  {
    id: 'contact-1',
    name: 'Sarah Chen',
    title: 'Senior Product Marketing Manager',
    company: 'Stripe',
    email: 'sarah.chen@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/sarahchen',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[0], mockCommonalities[3]],
    notes: 'Potential target for product marketing role',
    tags: ['stripe', 'product-marketing', 'target'],
    addedAt: new Date('2024-01-15'),
    lastInteraction: new Date('2024-01-20')
  },
  {
    id: 'contact-3',
    name: 'Mike Rodriguez',
    title: 'VP Product Marketing',
    company: 'Stripe',
    email: 'mike.rodriguez@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/mikerodriguez',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[1], mockCommonalities[8]],
    notes: 'Senior PM leader at Stripe',
    tags: ['stripe', 'vp', 'target'],
    addedAt: new Date('2024-01-12'),
  },
  {
    id: 'contact-5',
    name: 'Jennifer Liu',
    title: 'Product Marketing Lead',
    company: 'Stripe',
    email: 'jennifer.liu@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/jenniferliu',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[3], mockCommonalities[5]],
    notes: 'RevOps community member',
    tags: ['stripe', 'revops', 'target'],
    addedAt: new Date('2024-01-18'),
  },
  {
    id: 'contact-11',
    name: 'Amanda Foster',
    title: 'Product Marketing Director',
    company: 'Stripe',
    email: 'amanda.foster@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/amandafoster',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[1], mockCommonalities[9]],
    notes: 'Senior product marketing leader at Stripe',
    tags: ['stripe', 'product-marketing', 'target'],
    addedAt: new Date('2024-01-17'),
  },
  {
    id: 'contact-12',
    name: 'Tom Wilson',
    title: 'Senior Product Manager',
    company: 'Stripe',
    email: 'tom.wilson@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/tomwilson',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[0], mockCommonalities[3], mockCommonalities[6]],
    notes: 'Product strategy focus at Stripe',
    tags: ['stripe', 'product', 'target'],
    addedAt: new Date('2024-01-19'),
  },
  {
    id: 'contact-13',
    name: 'Emily Rodriguez',
    title: 'Growth Product Manager',
    company: 'Stripe',
    email: 'emily.rodriguez@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/emilyrodriguez',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[11], mockCommonalities[12]],
    notes: 'Berkeley MBA, focuses on growth initiatives',
    tags: ['stripe', 'growth', 'target'],
    addedAt: new Date('2024-01-21'),
  },
  {
    id: 'contact-14',
    name: 'Marcus Johnson',
    title: 'Staff Product Designer',
    company: 'Stripe',
    email: 'marcus.johnson@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/marcusjohnson',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[13], mockCommonalities[14]],
    notes: 'Former Microsoft designer, leads design systems',
    tags: ['stripe', 'design', 'target'],
    addedAt: new Date('2024-01-22'),
  },
  {
    id: 'contact-15',
    name: 'Sophia Lee',
    title: 'Principal Product Manager',
    company: 'Stripe',
    email: 'sophia.lee@stripe.com',
    linkedinUrl: 'https://linkedin.com/in/sophialee',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[15]],
    notes: 'Stanford CS, YC network connections',
    tags: ['stripe', 'principal', 'target'],
    addedAt: new Date('2024-01-23'),
  },

  // META - 2nd Degree Contacts (8 contacts)
  {
    id: 'contact-6',
    name: 'David Chen',
    title: 'Senior Product Manager',
    company: 'Meta',
    email: 'david.chen@meta.com',
    linkedinUrl: 'https://linkedin.com/in/davidchen',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[4], mockCommonalities[5]],
    notes: 'Works with Alex Kumar at Meta, product strategy focus',
    tags: ['meta', 'product', 'target'],
    addedAt: new Date('2024-01-20'),
  },
  {
    id: 'contact-16',
    name: 'Ryan Martinez',
    title: 'Product Marketing Manager',
    company: 'Meta',
    email: 'ryan.martinez@meta.com',
    linkedinUrl: 'https://linkedin.com/in/ryanmartinez',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[1], mockCommonalities[12]],
    notes: 'UCLA alum, product marketing at Meta',
    tags: ['meta', 'product-marketing', 'target'],
    addedAt: new Date('2024-01-24'),
  },
  {
    id: 'contact-17',
    name: 'Jessica Wong',
    title: 'Senior Product Manager',
    company: 'Meta',
    email: 'jessica.wong@meta.com',
    linkedinUrl: 'https://linkedin.com/in/jessicawong',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[11], mockCommonalities[9]],
    notes: 'Berkeley MBA, works on Meta business products',
    tags: ['meta', 'product', 'target'],
    addedAt: new Date('2024-01-25'),
  },
  {
    id: 'contact-20',
    name: 'Michael Chang',
    title: 'Director of Product',
    company: 'Meta',
    email: 'michael.chang@meta.com',
    linkedinUrl: 'https://linkedin.com/in/michaelchang',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[4]],
    notes: 'Stanford alum, leads VR product initiatives',
    tags: ['meta', 'director', 'target'],
    addedAt: new Date('2024-01-28'),
  },
  {
    id: 'contact-21',
    name: 'Sarah Kim',
    title: 'Senior Product Designer',
    company: 'Meta',
    email: 'sarah.kim@meta.com',
    linkedinUrl: 'https://linkedin.com/in/sarahkim',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[13], mockCommonalities[3]],
    notes: 'Former Microsoft designer, now at Meta Reality Labs',
    tags: ['meta', 'design', 'target'],
    addedAt: new Date('2024-01-29'),
  },
  {
    id: 'contact-22',
    name: 'Andrew Liu',
    title: 'Product Manager - AI',
    company: 'Meta',
    email: 'andrew.liu@meta.com',
    linkedinUrl: 'https://linkedin.com/in/andrewliu',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[0], mockCommonalities[15]],
    notes: 'Former Google engineer, now working on Meta AI products',
    tags: ['meta', 'ai', 'target'],
    addedAt: new Date('2024-01-30'),
  },
  {
    id: 'contact-26',
    name: 'Christina Park',
    title: 'Senior UX Researcher',
    company: 'Meta',
    email: 'christina.park@meta.com',
    linkedinUrl: 'https://linkedin.com/in/christinapark',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[11]],
    notes: 'Stanford HCI, Berkeley MBA, leads user research for Meta products',
    tags: ['meta', 'research', 'target'],
    addedAt: new Date('2024-02-03'),
  },
  {
    id: 'contact-27',
    name: 'Brandon Lee',
    title: 'Product Manager - Growth',
    company: 'Meta',
    email: 'brandon.lee@meta.com',
    linkedinUrl: 'https://linkedin.com/in/brandonlee',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[1], mockCommonalities[4]],
    notes: 'UCLA alum, focuses on user acquisition and retention',
    tags: ['meta', 'growth', 'target'],
    addedAt: new Date('2024-02-04'),
  },

  // AIRBNB - 2nd Degree Contacts (8 contacts)
  {
    id: 'contact-18',
    name: 'Daniel Kim',
    title: 'Senior Product Manager',
    company: 'Airbnb',
    email: 'daniel.kim@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/danielkim',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[4]],
    notes: 'Stanford CS, product strategy at Airbnb',
    tags: ['airbnb', 'product', 'target'],
    addedAt: new Date('2024-01-26'),
  },
  {
    id: 'contact-19',
    name: 'Natalie Chen',
    title: 'Product Marketing Lead',
    company: 'Airbnb',
    email: 'natalie.chen@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/nataliechen',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[13], mockCommonalities[15]],
    notes: 'Former Microsoft PM, now leads product marketing',
    tags: ['airbnb', 'product-marketing', 'target'],
    addedAt: new Date('2024-01-27'),
  },
  {
    id: 'contact-23',
    name: 'Jennifer Park',
    title: 'Director of Growth',
    company: 'Airbnb',
    email: 'jennifer.park@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/jenniferpark',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[11], mockCommonalities[9]],
    notes: 'Berkeley MBA, leads growth initiatives at Airbnb',
    tags: ['airbnb', 'growth', 'target'],
    addedAt: new Date('2024-01-31'),
  },
  {
    id: 'contact-24',
    name: 'Robert Taylor',
    title: 'Senior Product Designer',
    company: 'Airbnb',
    email: 'robert.taylor@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/roberttaylor',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[6], mockCommonalities[12]],
    notes: 'Stanford design alum, works on host experience',
    tags: ['airbnb', 'design', 'target'],
    addedAt: new Date('2024-02-01'),
  },
  {
    id: 'contact-25',
    name: 'Lisa Martinez',
    title: 'Product Manager - Experiences',
    company: 'Airbnb',
    email: 'lisa.martinez@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/lisamartinez',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[1], mockCommonalities[10]],
    notes: 'UCLA alum, former Airbnb intern now full-time PM',
    tags: ['airbnb', 'experiences', 'target'],
    addedAt: new Date('2024-02-02'),
  },
  {
    id: 'contact-28',
    name: 'Alex Rodriguez',
    title: 'Senior Data Scientist',
    company: 'Airbnb',
    email: 'alex.rodriguez@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/alexrodriguez',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[11], mockCommonalities[6]],
    notes: 'Berkeley PhD, Stanford postdoc, leads pricing algorithms',
    tags: ['airbnb', 'data-science', 'target'],
    addedAt: new Date('2024-02-05'),
  },
  {
    id: 'contact-29',
    name: 'Maya Patel',
    title: 'Product Manager - Trust & Safety',
    company: 'Airbnb',
    email: 'maya.patel@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/mayapatel',
    degree: 2,
    relationshipStrength: 'weak',
    commonalities: [mockCommonalities[1], mockCommonalities[9]],
    notes: 'UCLA alum, focuses on platform safety and user trust',
    tags: ['airbnb', 'trust-safety', 'target'],
    addedAt: new Date('2024-02-06'),
  },
  {
    id: 'contact-30',
    name: 'Kevin Wu',
    title: 'Engineering Manager',
    company: 'Airbnb',
    email: 'kevin.wu@airbnb.com',
    linkedinUrl: 'https://linkedin.com/in/kevinwu',
    degree: 2,
    relationshipStrength: 'medium',
    commonalities: [mockCommonalities[6], mockCommonalities[10]],
    notes: 'Stanford CS, former Airbnb engineer now leads mobile team',
    tags: ['airbnb', 'engineering', 'target'],
    addedAt: new Date('2024-02-07'),
  }
];

export const mockBridges: Bridge[] = [
  {
    id: 'bridge-1',
    bridgeContactId: 'contact-2', // Alex Kumar
    targetContactId: 'contact-1', // Sarah Chen
    strength: 0.9,
    commonality: mockCommonalities[0],
    reasoning: 'Alex and Sarah both worked at Google and are now in product roles. Strong professional connection.'
  },
  {
    id: 'bridge-2',
    bridgeContactId: 'contact-4', // Priya Patel
    targetContactId: 'contact-3', // Mike Rodriguez
    strength: 0.8,
    commonality: mockCommonalities[1],
    reasoning: 'Both UCLA alumni with marketing backgrounds. Priya can credibly introduce based on shared alma mater.'
  },
  {
    id: 'bridge-3',
    bridgeContactId: 'contact-2', // Alex Kumar
    targetContactId: 'contact-6', // David Chen
    strength: 0.95,
    commonality: mockCommonalities[4],
    reasoning: 'Alex and David work together at Meta in the same product organization. Direct colleagues with strong working relationship.'
  },
  {
    id: 'bridge-4',
    bridgeContactId: 'contact-7', // Lisa Wang
    targetContactId: 'contact-1', // Sarah Chen
    strength: 0.85,
    commonality: mockCommonalities[0],
    reasoning: 'Lisa and Sarah both worked at Google, Lisa knows many Stripe people through tech community.'
  },
  {
    id: 'bridge-5',
    bridgeContactId: 'contact-8', // James Thompson
    targetContactId: 'contact-11', // Amanda Foster
    strength: 0.88,
    commonality: mockCommonalities[6],
    reasoning: 'James is former Stripe designer, knows Amanda from product marketing collaboration.'
  },
  {
    id: 'bridge-6',
    bridgeContactId: 'contact-9', // Rachel Kim
    targetContactId: 'contact-3', // Mike Rodriguez
    strength: 0.82,
    commonality: mockCommonalities[1],
    reasoning: 'Rachel and Mike both UCLA alumni, Rachel knows Mike through marketing community.'
  },
  {
    id: 'bridge-7',
    bridgeContactId: 'contact-10', // Kevin Park
    targetContactId: 'contact-5', // Jennifer Liu
    strength: 0.79,
    commonality: mockCommonalities[3],
    reasoning: 'Kevin and Jennifer both active in RevOps Collective community.'
  }
];

export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    contactId: 'contact-1',
    type: 'connect',
    reasoning: 'Sarah Chen is a Senior PM at Stripe, perfect for your product marketing job search. Strong bridge path via Alex Kumar.',
    confidence: 0.9,
    commonality: mockCommonalities[0],
    suggestedAction: 'Request introduction via Alex Kumar highlighting Google connection',
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'rec-2',
    contactId: 'contact-3',
    type: 'connect',
    reasoning: 'VP-level contact at Stripe. UCLA connection via Priya Patel provides credible introduction path.',
    confidence: 0.85,
    commonality: mockCommonalities[1],
    suggestedAction: 'Request introduction via Priya Patel emphasizing UCLA alumni connection',
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'rec-3',
    contactId: 'contact-2',
    type: 'follow_up',
    reasoning: 'Haven\'t connected with Alex in a few weeks. Great time to check in and explore Stripe connections.',
    confidence: 0.7,
    commonality: mockCommonalities[0],
    suggestedAction: 'Send casual follow-up message referencing Google days',
    createdAt: new Date('2024-01-25')
  },
  {
    id: 'rec-4',
    contactId: 'contact-6',
    type: 'connect',
    reasoning: 'David Chen is a Senior PM at Meta with product strategy focus. Perfect bridge path via Alex Kumar who works directly with him.',
    confidence: 0.95,
    commonality: mockCommonalities[4],
    suggestedAction: 'Request introduction via Alex Kumar highlighting their direct working relationship at Meta',
    createdAt: new Date('2024-01-20')
  }
];

export const mockDrafts: Draft[] = [
  {
    id: 'draft-1',
    targetContactId: 'contact-1',
    bridgeContactId: 'contact-2',
    type: 'gmail_intro',
    subject: 'Quick intro request - fellow Google Ads alum',
    content: `Hi Alex,

Hope you're doing well! I'm reaching out because I remember you mentioning your connection to Stripe during our Google days. I'm exploring product marketing opportunities and would love a brief intro to Sarah Chen if you think it makes sense.

We both worked on the Google Ads team (you were there when I joined in 2019), so I thought you'd be a credible bridge. Happy to send more context if helpful.

Thanks for considering!
- Maya`,
    commonalityUsed: mockCommonalities[0],
    tone: 'professional',
    status: 'draft',
    createdAt: new Date('2024-01-25')
  },
  {
    id: 'draft-2',
    targetContactId: 'contact-3',
    bridgeContactId: 'contact-4',
    type: 'linkedin_message',
    content: `Hi Priya,

Hope you're doing well at Airbnb! I'm reaching out to see if you'd be comfortable making an introduction to Mike Rodriguez at Stripe. I'm exploring product marketing roles and his VP perspective would be incredibly valuable.

Given our UCLA connection and shared marketing background, I thought you might be a great person to facilitate this intro. Happy to provide more context about my background and what I'm looking for.

Would you be open to a brief intro?

Best,
Maya`,
    commonalityUsed: mockCommonalities[1],
    tone: 'professional',
    status: 'draft',
    createdAt: new Date('2024-01-24')
  },
  {
    id: 'draft-3',
    targetContactId: 'contact-6',
    bridgeContactId: 'contact-2',
    type: 'linkedin_message',
    content: `Hi Alex,

Hope things are going well at Meta! I wanted to reach out about a potential introduction. I'm exploring product management opportunities and noticed you work with David Chen in the product org.

Given your direct working relationship and the fact that you both focus on product strategy, I thought you might be the perfect person to facilitate an intro. I'd love to learn more about Meta's product approach and David's experience.

Would you be comfortable making a brief introduction?

Thanks!
Maya`,
    commonalityUsed: mockCommonalities[4],
    tone: 'professional',
    status: 'draft',
    createdAt: new Date('2024-01-26')
  }
];

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    contactId: 'contact-2',
    type: 'follow_up',
    title: 'Follow up with Alex Kumar',
    description: 'Check in about Stripe introduction and catch up on Google days',
    dueDate: new Date('2024-01-28'),
    priority: 'high',
    status: 'pending',
    createdAt: new Date('2024-01-25')
  },
  {
    id: 'task-2',
    contactId: 'contact-1',
    type: 'meeting_prep',
    title: 'Prepare for Sarah Chen intro call',
    description: 'Research Stripe product marketing strategy and prepare questions',
    dueDate: new Date('2024-01-30'),
    priority: 'medium',
    status: 'pending',
    createdAt: new Date('2024-01-26')
  },
  {
    id: 'task-3',
    contactId: 'contact-4',
    type: 'reminder',
    title: 'Thank Priya for introduction',
    description: 'Send thank you note for facilitating Mike Rodriguez introduction',
    dueDate: new Date('2024-01-27'),
    priority: 'medium',
    status: 'completed',
    createdAt: new Date('2024-01-24'),
    completedAt: new Date('2024-01-27')
  },
  {
    id: 'task-4',
    contactId: 'contact-6',
    type: 'follow_up',
    title: 'Request David Chen introduction via Alex',
    description: 'Ask Alex Kumar for introduction to David Chen at Meta',
    dueDate: new Date('2024-01-29'),
    priority: 'high',
    status: 'pending',
    createdAt: new Date('2024-01-26')
  }
];

// Updated meetings with proper dates and status to show 1 completed, 2 scheduled
export const mockMeetings: Meeting[] = [
  {
    id: 'meeting-1',
    title: 'Intro call with Sarah Chen - Product Marketing at Stripe',
    attendees: ['contact-1'], // Sarah Chen from Stripe
    startTime: new Date('2024-02-01T15:00:00'),
    duration: 30,
    meetLink: 'https://meet.google.com/stripe-sarah-intro',
    notes: 'Discuss product marketing role opportunities at Stripe. Focus on team structure and growth plans.',
    status: 'scheduled',
    createdAt: new Date('2024-01-26')
  },
  {
    id: 'meeting-2',
    title: 'Coffee chat with Alex Kumar - Meta Product Strategy',
    attendees: ['contact-2'], // Alex Kumar from Meta
    startTime: new Date('2024-01-24T10:00:00'), // Past date to show as completed
    duration: 45,
    meetLink: 'https://meet.google.com/meta-alex-coffee',
    notes: 'Catch up on Google days and discuss Meta product opportunities. Great conversation about networking strategies.',
    status: 'completed',
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'meeting-3',
    title: 'Product Strategy Discussion with David Chen - Meta',
    attendees: ['contact-6'], // David Chen from Meta
    startTime: new Date('2024-02-05T14:00:00'),
    duration: 30,
    meetLink: 'https://meet.google.com/meta-david-strategy',
    notes: 'Learn about Meta product strategy and PM opportunities. Discuss product roadmap and team dynamics.',
    status: 'scheduled',
    createdAt: new Date('2024-01-26')
  }
];

export const mockActivities: Activity[] = [
  {
    id: 'activity-1',
    type: 'message_sent',
    title: 'Introduction request sent',
    description: 'Sent introduction request to Alex Kumar for Sarah Chen at Stripe',
    contactId: 'contact-2',
    contactName: 'Alex Kumar',
    metadata: {
      platform: 'gmail',
      messageType: 'intro_request'
    },
    timestamp: new Date('2024-01-26T14:30:00')
  },
  {
    id: 'activity-2',
    type: 'meeting_scheduled',
    title: 'Meeting scheduled',
    description: 'Scheduled intro call with Sarah Chen for February 1st',
    contactId: 'contact-1',
    contactName: 'Sarah Chen',
    metadata: {
      platform: 'calendar',
      meetingDuration: 30
    },
    timestamp: new Date('2024-01-26T11:15:00')
  },
  {
    id: 'activity-3',
    type: 'message_received',
    title: 'Positive response received',
    description: 'Alex Kumar agreed to make the introduction to Sarah Chen',
    contactId: 'contact-2',
    contactName: 'Alex Kumar',
    metadata: {
      platform: 'gmail',
      messageType: 'intro_request'
    },
    timestamp: new Date('2024-01-26T09:45:00')
  },
  {
    id: 'activity-4',
    type: 'draft_created',
    title: 'Draft message created',
    description: 'AI generated introduction request for Sarah Chen via Alex Kumar',
    contactId: 'contact-1',
    contactName: 'Sarah Chen',
    metadata: {
      draftType: 'gmail_intro'
    },
    timestamp: new Date('2024-01-25T16:20:00')
  },
  {
    id: 'activity-5',
    type: 'connection_made',
    title: 'New connection added',
    description: 'Added Jennifer Liu from Stripe to your network',
    contactId: 'contact-5',
    contactName: 'Jennifer Liu',
    metadata: {
      platform: 'linkedin'
    },
    timestamp: new Date('2024-01-25T10:30:00')
  },
  {
    id: 'activity-6',
    type: 'meeting_completed',
    title: 'Meeting completed',
    description: 'Completed coffee chat with Alex Kumar - discussed networking opportunities',
    contactId: 'contact-2',
    contactName: 'Alex Kumar',
    metadata: {
      platform: 'calendar',
      meetingDuration: 45
    },
    timestamp: new Date('2024-01-24T10:45:00')
  },
  {
    id: 'activity-7',
    type: 'task_completed',
    title: 'Task completed',
    description: 'Sent thank you note to Priya Patel for introduction',
    contactId: 'contact-4',
    contactName: 'Priya Patel',
    timestamp: new Date('2024-01-24T08:15:00')
  },
  {
    id: 'activity-8',
    type: 'linkedin_connected',
    title: 'LinkedIn connected',
    description: 'Successfully imported 12 connections from LinkedIn',
    metadata: {
      platform: 'linkedin'
    },
    timestamp: new Date('2024-01-23T14:00:00')
  },
  {
    id: 'activity-9',
    type: 'gmail_connected',
    title: 'Gmail connected',
    description: 'Connected Gmail account for sending introduction requests',
    metadata: {
      platform: 'gmail'
    },
    timestamp: new Date('2024-01-23T14:05:00')
  },
  {
    id: 'activity-10',
    type: 'calendar_connected',
    title: 'Google Calendar connected',
    description: 'Connected Google Calendar for meeting scheduling',
    metadata: {
      platform: 'calendar'
    },
    timestamp: new Date('2024-01-23T14:10:00')
  },
  {
    id: 'activity-11',
    type: 'connection_made',
    title: 'New connection added',
    description: 'Added David Chen from Meta to your network',
    contactId: 'contact-6',
    contactName: 'David Chen',
    metadata: {
      platform: 'linkedin'
    },
    timestamp: new Date('2024-01-20T15:30:00')
  },
  {
    id: 'activity-12',
    type: 'draft_created',
    title: 'Draft message created',
    description: 'AI generated introduction request for David Chen via Alex Kumar',
    contactId: 'contact-6',
    contactName: 'David Chen',
    metadata: {
      draftType: 'linkedin_message'
    },
    timestamp: new Date('2024-01-26T17:45:00')
  }
];