/** This file is part of Jupiterp. See LICENSE at the repository root.
 * Landing-page copy and destinations, shared by the welcome tabs and tool tour.
 */
export const tools = [
  {
    id: 'planner',
    label: 'Plan your courses',
    name: 'Course Planner',
    href: '/planner',
    cta: 'Start planning',
    headline: 'Build your UMD schedule.',
    intro: 'The Course Planner is the heart of Jupiterp. Search any course and see your week come together.',
    bullets: [
      'Search by course, department or number',
      'Live open seats and GenEd info',
      'Keep several schedules side by side',
    ],
    description:
      'Search every course UMD offers this term, open a course to see its sections, and drop them onto your week. Each section shows its grade distribution and instructor rating, so you see what you’re signing up for before you sign up.',
    features: [
      ['Search any way', 'Course code, department or number'],
      ['Live seats', 'Open seats and waitlists per section'],
      ['GenEds at a glance', 'Tags shown on every course'],
      ['Many schedules', 'Keep plan A, B and C side by side'],
    ],
  },
  {
    id: 'generator',
    label: 'Find your schedule',
    name: 'Schedule Generator',
    href: '/generate',
    cta: 'Find my schedule',
    headline: 'Your courses. Every possibility.',
    intro: 'Add your courses, set your preferences, and find a schedule that fits your life.',
    bullets: [
      'Block off work, practice or time to recharge',
      'Choose a specific professor or section',
      'Send your favorite straight to the planner',
    ],
    description:
      'Add your courses, block off times you need free, and pin a specific professor or section. Jupiterp finds the schedules that fit your choices and ranks them, so you can pick from real options instead of trying sections one at a time.',
    features: [
      ['Blocked times', 'Keep work, practice or sleep free'],
      ['Pin your choices', 'Choose a specific professor or section'],
      ['Days off', 'Ask for a free Friday'],
      ['Sort your way', 'Compact, fewest gaps, earliest finish, latest start'],
      ['One click to planner', 'Send the one you like to the Course Planner'],
    ],
  },
  {
    id: 'grades',
    label: 'Explore grade trends',
    name: 'Grade Data',
    href: '/professors',
    cta: 'Explore grade data',
    headline: 'Know the grades behind the course.',
    intro: 'Explore real UMD grade distributions before you choose your next section.',
    bullets: [
      'Grade history from the UMD Registrar',
      'Course and professor breakdowns',
      'See how grading changes over time',
    ],
    description:
      'See how a course and its professors actually grade. Distributions come from the UMD Office of the Registrar through a public records request, and cover every Fall and Spring term since 2010.',
    features: [
      ['Per course and professor', 'Right next to each section'],
      ['Transcript-style GPA', 'Averages leave out withdrawals'],
      ['Withdrawals on their own', 'A high W rate tells you something'],
      ['Trends over time', 'See how grading has shifted'],
    ],
  },
  {
    id: 'reviews',
    label: 'Read student reviews',
    name: 'Professor Reviews',
    href: '/professors',
    cta: 'Find a professor',
    headline: 'A little insight before you enroll.',
    intro: 'Hear from students who’ve been there, and share your own experience after the semester.',
    bullets: [
      'Ratings alongside every instructor',
      'Every published review is read and approved',
      'Your review is yours to withdraw',
    ],
    description:
      'Read what students say about a professor before you register, and leave a review once the semester’s over. Reviews follow a public review policy that keeps them about the teaching, not the person.',
    features: [
      ['Ratings in the planner', 'Next to every instructor’s name'],
      ['Moderated by people', 'Checked before it goes live'],
      ['Your review, your call', 'Withdraw it at any time'],
      ['Search professors', 'Every UMD instructor in one list'],
    ],
  },
  {
    id: 'compare',
    label: 'Compare different professors',
    name: 'Compare Professors',
    href: '/professors/compare',
    cta: 'See the differences',
    headline: 'Same course. A clearer choice.',
    intro: 'Put professors next to each other and find the section that feels right for you.',
    bullets: [
      'Start with a course or professor',
      'Compare grades on one shared scale',
      'Read ratings and reviews side by side',
    ],
    description:
      'Two sections, two professors, one seat. Choose a course, add the professors who teach it, and see their grade distributions, ratings and student reviews side by side.',
    features: [
      ['Start from a course', 'Or from a professor you know'],
      ['Matching columns', 'Same stats, easy to scan'],
    ],
  },
  {
    id: 'export',
    label: 'Take your schedule with you',
    name: 'Share & Export',
    href: '/planner',
    cta: 'Take my schedule',
    headline: 'Your semester, wherever you go.',
    intro: 'Take your finished schedule to the calendar you already check every day.',
    bullets: [
      'Download a standard .ics file',
      'Google, Apple, Outlook and more',
      'Send your plan to friends and advisors',
    ],
    description:
      'When your schedule is final, take it with you. Export it as an .ics file and your classes land in the calendar you already check every day.',
    features: [
      ['Standard .ics', 'Works with any calendar app'],
      ['Share your plan', 'Send it to friends and advisors'],
    ],
  },
] as const;
