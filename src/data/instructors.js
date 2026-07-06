export const instructors = [
  {
    id: "aseem",
    name: "Aseem Singhal",
    role: "Founder, Unfluke | SEBI Registered Research Analyst | Crypto Market Maker | Bestselling Author",
    bio: "Aseem started his career at JPMorgan and Deutsche Bank in Singapore, where he worked on risk tools, profit-and-loss systems, and trading infrastructure. He earned a Grade A appraisal at JPMorgan and three RARE Awards at Deutsche Bank for contributions above and beyond his daily responsibilities. He holds an MBA from IIM Kozhikode where he graduated Rank 1 with a Gold Medal (CGPA 4.0/4.33), an MBA from Kellogg School of Management, an MS in Financial Engineering from WorldQuant University, and an honours degree from NTU Singapore. He is also a BITS Pilani postgraduate in Finance and holds a PG certification in Big Data Analytics from IIT Guwahati. As an educator, Aseem has taught more than 3,000 students on Python-based algorithmic trading across Future University, Chitkara University, LearnApp, and Coursera. He is a visiting faculty at Chitkara University and has developed courses on Generative AI for Algorithmic Trading, Blockchain in Finance, and Python Automation for Traders on Coursera in collaboration with Starweaver. He has cleared CMT Level 2 and Level 3 from the CMT Association, is a SEBI Registered Research Analyst (RA number INH000024976), and holds FRM Level 1. He is the founder of Unfluke, India's most comprehensive backtesting platform for retail traders, covering option strategies, indicator backtesting, historical data including expired contracts, and strategy monetisation. He is a bestselling author of 51 Trading Strategies and Master Price Action Trading, both practical and backtested guides written specifically for Indian markets. His research paper on the impact of theta decay and delta fluctuations on Indian index option pricing has been published on SSRN. Aseem is also the creator of the Trading with Groww YouTube channel, which has grown to over 75,000 subscribers, covering daily Nifty and Bank Nifty analysis, options strategies, and market education. He currently also runs systematic market making and arbitrage strategies across centralised and decentralised crypto exchanges.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=85",
    highlights: [
      "SEBI Registered Research Analyst",
      "CMT Level 2 & 3",
      "Ex-JPMorgan, Ex-Deutsche Bank",
      "IIM Kozhikode, Gold Medalist",
      "Founder, Unfluke",
    ],
    credentials: [
      "CMT Level 2 and Level 3 Cleared (CMT Association)",
      "SEBI Registered Research Analyst (INH000024976)",
      "FRM Level 1",
      "IIM Kozhikode MBA, Gold Medalist Rank 1 (CGPA 4.0/4.33)",
      "Kellogg School of Management MBA",
      "NTU Singapore, Honors Graduate",
      "MS Financial Engineering, WorldQuant University",
      "BITS Pilani PG, Finance",
      "IIT Guwahati PG, Big Data Analytics",
      "Ex-JPMorgan | Ex-Deutsche Bank, Singapore",
      "Bestselling Author: 51 Trading Strategies and Master Price Action Trading",
      "SSRN Research Publication on Indian Index Options",
      "Taught 3,000+ students at Future University, Chitkara University, LearnApp, and Coursera",
      "Founder, Unfluke (backtesting platform for Indian retail traders)",
      "Trading with Groww YouTube Channel, 75,000+ subscribers",
      "Crypto Market Maker: CEX and DEX arbitrage strategies",
    ],
  },
];

export const getInstructor = (id) =>
  instructors.find((instructor) => instructor.id === id) || {
    name: "Instructor",
    role: "Expert",
    bio: "Instructor bio pending.",
    image: "",
    credentials: [],
  };
