/**
 * Single source of truth for the portfolio content.
 *
 * Everything here is Mohammad Omar's own information, carried over from his
 * previous portfolio (github.com/Omar-webcloud/Portfolio). Only the presentation
 * changed — the design now follows chanhdai.com.
 */

export const USER = {
  displayName: "Mohammad Omar",
  fullName: "Md Omar Faruk Chowdhury",
  username: "Omar-webcloud",
  jobTitle: "Frontend Developer",
  roles: [
    "Frontend Developer",
    "Web Developer",
    "WordPress Developer",
    "Full-Stack Developer",
  ],
  bio: "Building high-performance, intuitive digital experiences.",
  flipSentences: [
    "Building high-performance, intuitive digital experiences.",
    "Frontend Developer @ Webermelon.",
    "React, Next.js and TypeScript, daily.",
    "Chattogram → anywhere, GMT +6.",
  ],
  company: {
    name: "Webermelon",
    blurb: "Web & Software Development Agency",
    url: "https://webermelon.com/",
    logo: "/wm-logo.png",
  },
  address: "Chattogram, Bangladesh",
  timeZone: "Asia/Dhaka",
  utcOffsetLabel: "GMT +6",
  email: "omarfarukcihs@gmail.com",
  website: { label: "omar-webcloud.vercel.app", url: "https://omar-webcloud.vercel.app/" },
  github: "https://github.com/Omar-webcloud",
  linkedin: "https://www.linkedin.com/in/md-omar-faruk-chowdhury",
  linkedinLabel: "in/md-omar-faruk-chowdhury",
  resume: "/Resume.pdf",
  avatar: "/images/omar.png",
  availability: "Available for projects",
  quote:
    "I build with purpose — every line of code is crafted to solve a real problem, scale cleanly, and delight the people using it.",
} as const;

export const ABOUT = [
  "I'm Mohammad Omar (Md Omar Faruk Chowdhury) — a frontend developer from Chattogram, Bangladesh, building responsive, data-driven web applications.",
  "Currently at Webermelon, a web & software development agency, where I work client-facing across the full lifecycle: scoping, build, review, delivery.",
  "I care about the unglamorous parts — image weight, layout shift, focus states, and how a page feels on a mid-range phone over a slow connection.",
];

export const SKILLS = [
  {
    title: "Core Stack",
    items: [
      "Next.js",
      "React",
      "JavaScript",
      "TypeScript",
      "Tailwind CSS",
      "HTML5",
      "CSS3",
    ],
  },
  {
    title: "Backend & Data",
    items: [
      "Node.js",
      "Express",
      "REST API",
      "MongoDB",
      "Firebase",
      "Stripe",
      "Better Auth",
    ],
  },
  {
    title: "Tools & Platforms",
    items: [
      "Git",
      "GitHub",
      "Vercel",
      "Vite",
      "Figma",
      "Axios",
      "Framer Motion",
      "npm",
      "SCRUM",
      "Jest",
    ],
  },
] as const;

export type Experience = {
  company: string;
  companyBlurb: string;
  role: string;
  period: string;
  active?: boolean;
  description: string;
  tools: string[];
  url: string;
};

export const EXPERIENCES: Experience[] = [
  {
    company: "Webermelon",
    companyBlurb: "Web & Software Development Agency",
    role: "Frontend Developer",
    period: "May 2026 – Present",
    active: true,
    description:
      "Developing and maintaining client-facing web applications, collaborating on full project lifecycles from scoping through delivery, and contributing to internal tooling and component libraries.",
    tools: ["Next.js", "React", "Tailwind CSS", "WordPress"],
    url: "https://webermelon.com/",
  },
  {
    company: "Webermelon",
    companyBlurb: "Web & Software Development Agency",
    role: "Intern Web Developer",
    period: "Feb 2026 – Apr 2026",
    description:
      "Built responsive UI components, contributed to live client projects, and gained hands-on experience with professional development workflows, code reviews, and agile sprints.",
    tools: ["React", "JavaScript", "CSS", "Git"],
    url: "https://webermelon.com/",
  },
];

export const EDUCATION = {
  degree: "Bachelor of Arts",
  subject: "English Literature and Language",
  institution: "University of Chittagong",
};

export const CERTIFICATIONS = [
  {
    title: "Web Development",
    issuer: "SoloLearn",
    url: "https://api2.sololearn.com/v2/certificates/CC-HMCA6F6M/image/png",
  },
  {
    title: "Responsive Web Design",
    issuer: "freeCodeCamp",
    url: "https://freecodecamp.org/certification/fcc-43a93b12-1d40-4a5b-a38b-9b4846c24ed9/responsive-web-design",
  },
] as const;

export type Project = {
  num: string;
  title: string;
  type: string;
  description: string;
  stack: string[];
  link: string;
  github: string;
  image: string;
  imageDark?: string;
};

export const PROJECTS: Project[] = [
  {
    num: "01",
    title: "AUREUM",
    type: "AI Cafe Storefront",
    description:
      "A full-stack specialty coffee storefront and AI-powered cafe. Features an AI Barista chatbot for recommendations and order parsing, a live kitchen ticket rail, real-time analytics dashboard, and WhatsApp ordering integration.",
    stack: ["Next.js", "Tailwind CSS", "TypeScript", "Gemini AI", "Drizzle ORM", "WhatsApp API"],
    link: "https://aureum-cafe.vercel.app/",
    github: "https://github.com/Omar-webcloud/aureum-cafe",
    image: "/projects/Aureum-Cafe-Dashboard.png",
  },
  {
    num: "02",
    title: "ORDO",
    type: "Task Management API",
    description:
      "A minimalistic Task Management API built with a Node.js (Express) server and a Next.js frontend, designed for tracking, managing, and assigning tasks.",
    stack: ["Node.js", "Express", "Next.js", "Tailwind CSS", "TypeScript", "React"],
    link: "https://ordo-task-manager.vercel.app/",
    github: "https://github.com/Omar-webcloud/Ordo",
    image: "/projects/ordo.png",
  },
  {
    num: "03",
    title: "FABLE",
    type: "E-book Platform",
    description:
      "Modern e-book sharing platform featuring an RBAC (Role-Based Access Control) system where readers can browse, bookmark, and purchase ebooks while writers publish and manage their personal catalogs.",
    stack: ["Next.js", "Tailwind CSS", "Better Auth", "Stripe", "Framer Motion"],
    link: "https://fable-umber.vercel.app/",
    github: "https://github.com/Omar-webcloud/Fable",
    image: "/projects/fable-light.png",
    imageDark: "/projects/fable-dark.png",
  },
  {
    num: "04",
    title: "SALESPILOT",
    type: "Analytics Dashboard",
    description:
      "A modern analytics dashboard with revenue tracking, sales funnel visualization, team performance metrics, product management, and a real-time Currency Converter API.",
    stack: ["Next.js", "React", "Tailwind CSS", "API", "PostgreSQL", "Prisma"],
    link: "https://sales-dashboard-omar.vercel.app/",
    github: "https://github.com/omar-webcloud/Sales-CRM/",
    image: "/projects/sales-light.png",
    imageDark: "/projects/sales-dark.png",
  },
  {
    num: "05",
    title: "NEXO GADGETS",
    type: "E-commerce",
    description:
      "A Bangladeshi local gadget shop with WhatsApp integrated checkout with real products.",
    stack: ["Next.js", "Tailwind CSS 4", "Zustand", "WhatsApp API"],
    link: "https://nexo-gadgets.vercel.app/",
    github: "https://github.com/Omar-webcloud/NEXO-gadgets",
    image: "/projects/nexo-light.png",
    imageDark: "/projects/nexo-dark.png",
  },
  {
    num: "06",
    title: "BLOGGIN'",
    type: "Platform",
    description:
      "Modern blogging platform with full user authentication and post management capabilities.",
    stack: ["TypeScript", "Next.js", "Firebase"],
    link: "https://bloggin-app-six.vercel.app/",
    github: "https://github.com/Omar-webcloud/Bloggin-App",
    image: "/projects/bloggin.png",
  },
  {
    num: "07",
    title: "MEDIQUEUE",
    type: "EdTech Platform",
    description:
      "Tutor booking and educational queue management platform with real-time session scheduling, advanced filtering, and personalized dashboards for students and educators.",
    stack: ["Next.js", "Tailwind CSS 4", "Shadcn UI", "React Day Picker"],
    link: "https://medi-queue-smoky.vercel.app/",
    github: "https://github.com/Omar-webcloud/MediQueue",
    image: "/projects/mediqueue.png",
  },
  {
    num: "08",
    title: "PLASTITRACK",
    type: "GreenTech",
    description:
      "Web-based application that helps users monitor and reduce plastic consumption with intuitive tracking and visual charts.",
    stack: ["Next.js", "Tailwind CSS", "TypeScript"],
    link: "https://plasti-track.vercel.app/",
    github: "https://github.com/Omar-webcloud/PlastiTrack",
    image: "/projects/plastitrack-light.png",
    imageDark: "/projects/plastitrack-dark.png",
  },
  {
    num: "09",
    title: "SYNTAXA",
    type: "EdTech App",
    description:
      "Interactive grammar web application for practicing sentences and improving writing skills through dynamic exercises.",
    stack: ["Next.js", "Tailwind CSS", "TypeScript", "Framer Motion"],
    link: "https://syntaxa-ten.vercel.app/",
    github: "https://github.com/Omar-webcloud/syntaxa",
    image: "/projects/syntaxa-light.png",
    imageDark: "/projects/Syntaxa-dark.png",
  },
  {
    num: "10",
    title: "SKILL SPHERE",
    type: "E-learning",
    description:
      "Online learning platform for discovering and mastering new skills, featuring secure authentication, real-time course search, personalized profiles, and a modern hero slider.",
    stack: ["Next.js", "Better Auth", "Tailwind CSS 4", "DaisyUI", "Swiper.js"],
    link: "https://skill-sphere-omar.vercel.app/",
    github: "https://github.com/Omar-webcloud/SkillSphere",
    image: "/projects/skillsphere.png",
  },
  {
    num: "11",
    title: "WEBCHRONICLES",
    type: "Data Visualization",
    description:
      "Interactive web app visualizing internet mood and headlines over time using sentiment analysis and dynamic data fetching.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "API"],
    link: "https://web-chronicles.vercel.app/",
    github: "https://github.com/Omar-webcloud/WebChronicles",
    image: "/projects/webchronicles.png",
  },
  {
    num: "12",
    title: "FRESH FARM",
    type: "E-commerce",
    description:
      "Frontend e-commerce platform for fresh produce, featuring a clean and intuitive shopping interface.",
    stack: ["React", "JavaScript", "CSS"],
    link: "https://fresh-farm-zeta.vercel.app/",
    github: "https://github.com/Omar-webcloud/Fresh-Farm",
    image: "/projects/fresh-farm-light.png",
    imageDark: "/projects/fresh-farm-dark.png",
  },
  {
    num: "13",
    title: "KINO-XPLORER",
    type: "Search Tool",
    description:
      "Sleek movie discovery tool that lets you search and browse up-to-date film information effortlessly.",
    stack: ["React", "API", "JavaScript"],
    link: "https://kino-xplorer.vercel.app/",
    github: "https://github.com/Omar-webcloud/movie-explorer",
    image: "/projects/kino-xplorer.png",
  },
];

export const WRITING = [
  {
    title:
      "How to Choose the Right Tech Stack for Your Web Project (A Practical Guide for Developers)",
    excerpt:
      "You just decided to build something. You open your browser to research which stack to use and within ten minutes you are drowning in opinions. This guide skips the fluff and answers the questions that actually matter: what to use, when, and why.",
    readTime: "6 min read",
    category: "Web Development",
    link: "https://bloggin-app-six.vercel.app/post/pfG4DDttAXhIVkY8MfAz",
  },
  {
    title: "Image Optimization Techniques Every Frontend Developer Should Know",
    excerpt:
      "Images make a website look good, but they are also one of the biggest reasons a site becomes slow. When images are not handled properly, pages take longer to load and users leave early.",
    readTime: "5 min read",
    category: "Performance",
    link: "https://bloggin-app-six.vercel.app/post/pYTSIN48N3C1LB93DPHq",
  },
  {
    title: "Flexbox vs Grid and How I Choose Between Them",
    excerpt:
      "When I started learning modern CSS, Flexbox and Grid felt like magic. Suddenly layouts stopped being a fight and started to make sense. Over time though I realized they are not competitors.",
    readTime: "4 min read",
    category: "CSS Layout",
    link: "https://bloggin-app-six.vercel.app/post/SK7AwRIC5o3zZugpHRA2",
  },
] as const;

export const NAV = [
  { id: "overview", label: "Overview" },
  { id: "hello", label: "About" },
  { id: "stack", label: "Stack" },
  { id: "experience", label: "Experience" },
  { id: "work", label: "Work" },
  { id: "writing", label: "Writing" },
  { id: "contact", label: "Contact" },
] as const;
