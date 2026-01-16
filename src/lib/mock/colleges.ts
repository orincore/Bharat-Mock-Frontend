import { College, Course } from '@/types';

export const mockColleges: College[] = [
  {
    id: '1',
    name: 'Indian Institute of Technology, Bombay',
    location: 'Mumbai, Maharashtra',
    type: 'government',
    ranking: 1,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
    established: 1958,
    accreditation: ['NAAC A++', 'NBA', 'NIRF Top 10'],
    courses: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
    overview: 'IIT Bombay is one of India\'s premier engineering institutions, known for its cutting-edge research and world-class education. The institute offers programs in engineering, science, design, and management.',
    fees: {
      minFee: 200000,
      maxFee: 1000000,
      currency: 'INR',
      details: [
        { course: 'B.Tech', fee: 200000 },
        { course: 'M.Tech', fee: 150000 },
        { course: 'MBA', fee: 1000000 }
      ]
    },
    eligibility: [
      'JEE Advanced qualified for B.Tech',
      'GATE qualified for M.Tech',
      'CAT qualified for MBA'
    ],
    cutoffs: [
      { exam: 'JEE Advanced', year: 2023, category: 'General', rank: 150 },
      { exam: 'JEE Advanced', year: 2023, category: 'OBC', rank: 280 },
      { exam: 'GATE', year: 2023, category: 'General', rank: 500 }
    ],
    placements: {
      averagePackage: 2100000,
      highestPackage: 18000000,
      placementPercentage: 95,
      topRecruiters: ['Google', 'Microsoft', 'Goldman Sachs', 'McKinsey', 'Apple']
    },
    facilities: ['Library', 'Sports Complex', 'Hostels', 'Research Labs', 'Incubation Center'],
    website: 'https://www.iitb.ac.in'
  },
  {
    id: '2',
    name: 'Indian Institute of Technology, Delhi',
    location: 'New Delhi, Delhi',
    type: 'government',
    ranking: 2,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
    established: 1961,
    accreditation: ['NAAC A++', 'NBA', 'NIRF Top 10'],
    courses: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'M.Sc'],
    overview: 'IIT Delhi is renowned for its academic excellence and research contributions. Located in the heart of New Delhi, it attracts some of the brightest minds in the country.',
    fees: {
      minFee: 200000,
      maxFee: 950000,
      currency: 'INR',
      details: [
        { course: 'B.Tech', fee: 200000 },
        { course: 'M.Tech', fee: 150000 },
        { course: 'MBA', fee: 950000 }
      ]
    },
    eligibility: [
      'JEE Advanced qualified for B.Tech',
      'GATE qualified for M.Tech',
      'CAT qualified for MBA'
    ],
    cutoffs: [
      { exam: 'JEE Advanced', year: 2023, category: 'General', rank: 200 },
      { exam: 'JEE Advanced', year: 2023, category: 'OBC', rank: 350 }
    ],
    placements: {
      averagePackage: 2000000,
      highestPackage: 20000000,
      placementPercentage: 93,
      topRecruiters: ['Amazon', 'Facebook', 'Uber', 'Adobe', 'Samsung']
    },
    facilities: ['Central Library', 'Sports Facilities', 'Hostels', 'Labs', 'Startup Hub'],
    website: 'https://www.iitd.ac.in'
  },
  {
    id: '3',
    name: 'All India Institute of Medical Sciences',
    location: 'New Delhi, Delhi',
    type: 'government',
    ranking: 1,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
    established: 1956,
    accreditation: ['NAAC A++', 'MCI', 'NIRF Medical Top 1'],
    courses: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    overview: 'AIIMS Delhi is India\'s premier medical institution, known for its excellence in medical education, research, and patient care. It sets the benchmark for medical education in the country.',
    fees: {
      minFee: 5000,
      maxFee: 50000,
      currency: 'INR',
      details: [
        { course: 'MBBS', fee: 5000 },
        { course: 'MD/MS', fee: 50000 }
      ]
    },
    eligibility: [
      'NEET UG qualified for MBBS',
      'INI-CET qualified for PG courses'
    ],
    cutoffs: [
      { exam: 'NEET UG', year: 2023, category: 'General', rank: 50 },
      { exam: 'NEET UG', year: 2023, category: 'OBC', rank: 100 }
    ],
    placements: {
      averagePackage: 1500000,
      highestPackage: 5000000,
      placementPercentage: 100,
      topRecruiters: ['Apollo Hospitals', 'Fortis', 'Max Healthcare', 'Medanta']
    },
    facilities: ['Teaching Hospital', 'Research Centers', 'Hostels', 'Library', 'Labs'],
    website: 'https://www.aiims.edu'
  },
  {
    id: '4',
    name: 'Indian Institute of Management, Ahmedabad',
    location: 'Ahmedabad, Gujarat',
    type: 'government',
    ranking: 1,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
    established: 1961,
    accreditation: ['AACSB', 'EQUIS', 'AMBA', 'NIRF Management Top 1'],
    courses: ['MBA (PGP)', 'PGPX', 'PhD', 'Executive Education'],
    overview: 'IIM Ahmedabad is India\'s top business school, known for its rigorous curriculum, case study methodology, and producing some of India\'s best business leaders.',
    fees: {
      minFee: 2300000,
      maxFee: 3500000,
      currency: 'INR',
      details: [
        { course: 'MBA (PGP)', fee: 2300000 },
        { course: 'PGPX', fee: 3500000 }
      ]
    },
    eligibility: [
      'CAT qualified with high percentile',
      'Work experience preferred for PGPX'
    ],
    cutoffs: [
      { exam: 'CAT', year: 2023, category: 'General', rank: 99 },
      { exam: 'CAT', year: 2023, category: 'OBC', rank: 95 }
    ],
    placements: {
      averagePackage: 3200000,
      highestPackage: 70000000,
      placementPercentage: 100,
      topRecruiters: ['McKinsey', 'BCG', 'Bain', 'Goldman Sachs', 'Amazon']
    },
    facilities: ['Library', 'Sports Complex', 'Hostels', 'Amphitheatre', 'Incubation'],
    website: 'https://www.iima.ac.in'
  },
  {
    id: '5',
    name: 'National Law School of India University',
    location: 'Bangalore, Karnataka',
    type: 'government',
    ranking: 1,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
    established: 1987,
    accreditation: ['NAAC A++', 'BCI', 'NIRF Law Top 1'],
    courses: ['BA LLB', 'LLM', 'PhD'],
    overview: 'NLSIU is India\'s premier law school, pioneering the five-year integrated law program. It has produced some of the finest legal minds in the country.',
    fees: {
      minFee: 250000,
      maxFee: 400000,
      currency: 'INR',
      details: [
        { course: 'BA LLB', fee: 250000 },
        { course: 'LLM', fee: 400000 }
      ]
    },
    eligibility: [
      'CLAT qualified for BA LLB',
      'CLAT PG qualified for LLM'
    ],
    cutoffs: [
      { exam: 'CLAT', year: 2023, category: 'General', rank: 100 }
    ],
    placements: {
      averagePackage: 2000000,
      highestPackage: 5000000,
      placementPercentage: 100,
      topRecruiters: ['AZB', 'Cyril Amarchand', 'Khaitan & Co', 'Trilegal']
    },
    facilities: ['Law Library', 'Moot Court', 'Hostels', 'Sports', 'Legal Aid Clinic'],
    website: 'https://www.nls.ac.in'
  },
  {
    id: '6',
    name: 'Birla Institute of Technology and Science',
    location: 'Pilani, Rajasthan',
    type: 'private',
    ranking: 15,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800',
    established: 1964,
    accreditation: ['NAAC A', 'NBA', 'NIRF Top 20'],
    courses: ['B.E.', 'M.E.', 'PhD', 'MBA'],
    overview: 'BITS Pilani is one of India\'s leading private engineering institutions, known for its industry connect programs and flexible academic structure.',
    fees: {
      minFee: 500000,
      maxFee: 2000000,
      currency: 'INR',
      details: [
        { course: 'B.E.', fee: 500000 },
        { course: 'MBA', fee: 2000000 }
      ]
    },
    eligibility: [
      'BITSAT qualified for B.E.',
      'GATE qualified for M.E.'
    ],
    cutoffs: [
      { exam: 'BITSAT', year: 2023, category: 'General', rank: 350 }
    ],
    placements: {
      averagePackage: 1800000,
      highestPackage: 15000000,
      placementPercentage: 90,
      topRecruiters: ['Microsoft', 'Google', 'Goldman Sachs', 'Sprinklr']
    },
    facilities: ['Central Library', 'Labs', 'Hostels', 'Sports Complex', 'Innovation Hub'],
    website: 'https://www.bits-pilani.ac.in'
  }
];

export const mockCourses: Course[] = [
  {
    id: '1',
    name: 'Bachelor of Technology (B.Tech)',
    duration: '4 Years',
    level: 'undergraduate',
    description: 'A four-year undergraduate engineering program that provides in-depth knowledge in various engineering disciplines including Computer Science, Mechanical, Electrical, and more.',
    eligibility: [
      'Passed 10+2 with Physics, Chemistry, and Mathematics',
      'Minimum 75% aggregate marks',
      'JEE Main / JEE Advanced qualification'
    ],
    careerProspects: [
      'Software Engineer',
      'Data Scientist',
      'Product Manager',
      'Research Scientist',
      'Entrepreneur'
    ],
    averageSalary: 800000,
    topColleges: ['IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kanpur', 'NIT Trichy'],
    image: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800'
  },
  {
    id: '2',
    name: 'Bachelor of Medicine and Bachelor of Surgery (MBBS)',
    duration: '5.5 Years',
    level: 'undergraduate',
    description: 'A comprehensive medical degree program that prepares students for a career in medicine, covering all aspects of human health and disease management.',
    eligibility: [
      'Passed 10+2 with Physics, Chemistry, and Biology',
      'Minimum 50% aggregate marks',
      'NEET UG qualification'
    ],
    careerProspects: [
      'Medical Doctor',
      'Surgeon',
      'Specialist Physician',
      'Medical Researcher',
      'Hospital Administrator'
    ],
    averageSalary: 1200000,
    topColleges: ['AIIMS Delhi', 'CMC Vellore', 'JIPMER', 'AFMC Pune', 'KMC Manipal'],
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800'
  },
  {
    id: '3',
    name: 'Master of Business Administration (MBA)',
    duration: '2 Years',
    level: 'postgraduate',
    description: 'A professional graduate degree that provides comprehensive management education, preparing students for leadership roles in business and industry.',
    eligibility: [
      'Bachelor\'s degree in any discipline',
      'CAT / XAT / GMAT qualification',
      'Work experience preferred'
    ],
    careerProspects: [
      'Management Consultant',
      'Investment Banker',
      'Marketing Manager',
      'Operations Head',
      'Entrepreneur'
    ],
    averageSalary: 2500000,
    topColleges: ['IIM Ahmedabad', 'IIM Bangalore', 'IIM Calcutta', 'ISB Hyderabad', 'XLRI'],
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800'
  },
  {
    id: '4',
    name: 'Bachelor of Arts in Law (BA LLB)',
    duration: '5 Years',
    level: 'undergraduate',
    description: 'An integrated law program combining arts education with legal studies, preparing students for careers in legal practice, judiciary, and corporate law.',
    eligibility: [
      'Passed 10+2 in any stream',
      'Minimum 45% aggregate marks',
      'CLAT / AILET qualification'
    ],
    careerProspects: [
      'Advocate',
      'Corporate Lawyer',
      'Legal Advisor',
      'Judge',
      'Legal Analyst'
    ],
    averageSalary: 1000000,
    topColleges: ['NLSIU Bangalore', 'NALSAR Hyderabad', 'NLU Delhi', 'WBNUJS Kolkata'],
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'
  },
  {
    id: '5',
    name: 'Bachelor of Science (B.Sc)',
    duration: '3 Years',
    level: 'undergraduate',
    description: 'A foundational science program offering specialization in Physics, Chemistry, Mathematics, Biology, and other scientific disciplines.',
    eligibility: [
      'Passed 10+2 with Science subjects',
      'Minimum 50% aggregate marks',
      'Entrance exam for premier institutions'
    ],
    careerProspects: [
      'Research Scientist',
      'Lab Technician',
      'Data Analyst',
      'Teacher',
      'Science Writer'
    ],
    averageSalary: 400000,
    topColleges: ['St. Stephen\'s College', 'Hindu College', 'Presidency University', 'IISc'],
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800'
  },
  {
    id: '6',
    name: 'Master of Technology (M.Tech)',
    duration: '2 Years',
    level: 'postgraduate',
    description: 'An advanced engineering program focusing on specialized technical knowledge and research skills in various engineering domains.',
    eligibility: [
      'B.Tech/B.E. in relevant discipline',
      'GATE qualification',
      'Minimum 60% in graduation'
    ],
    careerProspects: [
      'Senior Engineer',
      'Technical Architect',
      'Research Engineer',
      'Professor',
      'Consultant'
    ],
    averageSalary: 1500000,
    topColleges: ['IIT Bombay', 'IIT Delhi', 'IIT Kharagpur', 'IISc Bangalore', 'NIT Trichy'],
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'
  }
];

export const getCollegeById = (id: string): College | undefined => {
  return mockColleges.find(college => college.id === id);
};

export const getCourseById = (id: string): Course | undefined => {
  return mockCourses.find(course => course.id === id);
};

export const getCollegesByType = (type: College['type']): College[] => {
  return mockColleges.filter(college => college.type === type);
};
