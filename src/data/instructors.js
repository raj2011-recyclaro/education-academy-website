export const instructors = [
  {
    id: "elena",
    name: "Dr. Elena Rostova",
    role: "Lead AI Researcher, TechNova",
    bio: "Elena has spent the last decade building machine-learning systems for global teams. Her teaching bridges rigorous theory with immediate practical application.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=85",
  },
  {
    id: "jonathan",
    name: "Dr. Jonathan Vance",
    role: "Former Quant, Meridian Capital",
    bio: "Jonathan designs quantitative systems and mentors analysts moving from theory into institutional-grade financial modeling.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=85",
  },
  {
    id: "sarah",
    name: "Prof. Sarah Jenkins",
    role: "Information Designer, MIT Media Lab",
    bio: "Sarah helps product teams make complex systems legible, useful, and humane.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=85",
  },
  {
    id: "marcus",
    name: "Marcus Cole",
    role: "Cloud Platform Director",
    bio: "Marcus has led platform modernization programs across fintech, health, and enterprise software.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=85",
  },
];

export const getInstructor = (id) => instructors.find((instructor) => instructor.id === id) || { name: "Instructor", role: "Expert", bio: "Instructor bio pending.", image: "" };
