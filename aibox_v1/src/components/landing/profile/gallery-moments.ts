export type GalleryMoment = {
  id: string;
  image: { src: string; alt: string };
  frame: {
    name: string;
    code: string;
    tone: "amber" | "blue" | "rose" | "violet" | "green" | "mono";
    caption: string;
    ornament: "sun" | "orbit" | "petals";
  };
  source: "ai-generated" | "customer";
  description: string;
  feedback?: { quote: string; attribution: string; source: "sample" | "customer" };
};

/** Replace individual samples with approved customer photos as they become available. */
export const galleryMoments: GalleryMoment[] = [
  {
    id: "afterglow",
    image: { src: "/images/gallery/afterglow-couple.webp", alt: "AI-generated portrait of a laughing couple at an evening celebration" },
    frame: { name: "Afterglow", code: "frm–01", tone: "amber", caption: "the good kind of forever.", ornament: "sun" },
    source: "ai-generated",
    description: "Warm gold, a shared laugh, and a little room for a keepsake message.",
    feedback: { quote: "A little keepsake with all the feeling of the evening.", attribution: "Wedding guest / sample", source: "sample" },
  },
  {
    id: "blue-hour",
    image: { src: "/images/gallery/blue-hour-friends.webp", alt: "AI-generated portrait of three friends smiling at a launch party" },
    frame: { name: "Blue hour", code: "frm–02", tone: "blue", caption: "good company. great memories.", ornament: "orbit" },
    source: "ai-generated",
    description: "A clean cobalt frame for the people who make the evening.",
    feedback: { quote: "Our whole group, one frame. This is the photo we’d keep.", attribution: "Launch party guest / sample", source: "sample" },
  },
  {
    id: "soft-focus",
    image: { src: "/images/gallery/soft-focus-celebration.webp", alt: "AI-generated portrait of two friends laughing at a wedding celebration" },
    frame: { name: "Soft focus", code: "frm–03", tone: "rose", caption: "right here, with you.", ornament: "petals" },
    source: "ai-generated",
    description: "Soft pink, an easy smile, and a frame that feels like the occasion.",
    feedback: { quote: "The best part would be making it together, then taking it home.", attribution: "Celebration guest / sample", source: "sample" },
  },
];
