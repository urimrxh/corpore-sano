/** Default copy & media — merged with localStorage in SiteContentContext */
export const defaultSiteContent = {
  global: {
    consultationCta: "Free Consultation",
    consultationCtaFooter: "Free consultation",
  },
  home: {
    heroTitle: "Online nutrition consultations made simple.",
    heroDescription:
      "Corpore Sano helps you schedule free online meetings with our nutrition specialists in a simple and comfortable way.",
    videoSectionHeading: "Short guides from our nutrition specialists.",
    videosViewAllLabel: "View all",
  },
  contact: {
    pageTitle: "Contact us",
    pageIntro:
      "Send us a message using the form below. We’ll reply as soon as we can.",
    /** Empty = use built-in asset from CSS. Otherwise full URL or path e.g. /my-bg.jpg */
    backgroundImageUrl: "",
    form: {
      labels: {
        fullName: "Full name",
        email: "Email",
        subject: "Subject",
        message: "Message",
        subjectPlaceholder: "What is your message about?",
        messagePlaceholder: "Write your message here…",
        submit: "Send message",
        success:
          "Thanks — your message has been recorded. We’ll get back to you soon.",
      },
    },
  },
  about: {
    pageTitle: "About",
    pageIntro:
      "Learn more about Corpore Sano and how we support your nutrition journey.",
    sections: [
      {
        id: "about-section-1",
        imageLeft: true,
        /** grey | green-teal | green-mint | white | navy | black */
        textPanelTheme: "grey",
        image:
          "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1600&q=80",
        imageAlt: "Healthy meal and nutrition consultation",
        title: "Our mission",
        body: "Corpore Sano helps people build sustainable eating habits through clear guidance and personal online consultations with qualified nutrition specialists.",
      },
      {
        id: "about-section-2",
        imageLeft: false,
        textPanelTheme: "grey",
        image:
          "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
        imageAlt: "Wellness and balanced lifestyle",
        title: "How we work",
        body: "We combine evidence-based nutrition science with a practical approach—so you get plans that fit your life, not generic advice. Book a free consultation to get started.",
      },
    ],
  },
  videos: [
    {
      id: 1,
      title: "Healthy eating basics",
      desc: "A short introduction to balanced nutrition and how to achieve it.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      startAt: 0,
      endAt: null,
      category: "Nutrition",
      isPublished: true,
    },
    {
      id: 2,
      title: "Meal planning tips",
      desc: "Simple ideas for meal planning and consistency.",
      videoUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      startAt: 0,
      endAt: null,
      category: "Lifestyle",
      isPublished: true,
    },
    {
      id: 3,
      title: "Nutrition for beginners",
      desc: "A quick intro to better food choices.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      startAt: 0,
      endAt: null,
      category: "Nutrition",
      isPublished: true,
    },
    {
      id: 4,
      title: "Healthy snacks",
      desc: "Simple healthy snack ideas for your day.",
      videoUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      startAt: 0,
      endAt: null,
      category: "Habits",
      isPublished: true,
    },
  ],
  videosPage: {
    title: "All videos",
    intro: "Short guides from our nutrition specialists.",
  },
  footer: {
    brandName: "Corpore Sano",
    phone: "+383 44 123 456",
    phoneHref: "+38344123456",
    cityLine: "Pristina, Kosovo",
    address: "Sample Street 12, 10000 Pristina",
    email: "contact@corporesano.com",
    social: {
      facebook: "https://www.facebook.com/",
      instagram: "https://www.instagram.com/",
      linkedin: "https://www.linkedin.com/",
      emailMailto: "mailto:contact@corporesano.com",
    },
    copyright: "© 2026 Corpore Sano. All rights reserved.",
  },
  bookMeeting: {
    title: "Book a Meeting",
    intro:
      "Here users will be able to select an available time slot and fill in their information.",
  },
  nutritionists: {
    title: "Our Nutritionists",
    intro:
      "This page will introduce the male and female nutrition specialists of Corpore Sano.",
  },
};
