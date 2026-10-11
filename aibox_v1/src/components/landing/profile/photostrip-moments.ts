import type { GalleryMoment } from "./gallery-moments";

export type PhotostripMoment = {
  id: string;
  name: string;
  image: GalleryMoment["image"];
  tone: GalleryMoment["frame"]["tone"];
  feedback?: GalleryMoment["feedback"];
};

// These are illustrative reviews, not customer endorsements. Replace a strip's
// feedback with an approved quote and source: "customer" when one is available.
const sampleReviews = {
  celebration: {
    quote: "A little keepsake with all the feeling of the evening.",
    attribution: "Wedding guest / sample",
    source: "sample",
  },
  friends: {
    quote: "Our whole group, one frame. This is the photo we'd keep.",
    attribution: "Event guest / sample",
    source: "sample",
  },
  creative: {
    quote: "The best part would be making it together, then taking it home.",
    attribution: "Celebration guest / sample",
    source: "sample",
  },
} satisfies Record<string, NonNullable<PhotostripMoment["feedback"]>>;

type PhotostripDesign = {
  fileName: string;
  name: string;
  tone: PhotostripMoment["tone"];
  feedback?: PhotostripMoment["feedback"];
};

// The supplied artwork already includes its photos, frames, and branding.
// Home's photo wall and Gallery's design browser share this catalog.
const designs: PhotostripDesign[] = [
  { fileName: "aibox_theme.png", name: "Life in frames", tone: "amber", feedback: sampleReviews.friends },
  { fileName: "Wedding.png", name: "Wedding", tone: "amber", feedback: sampleReviews.celebration },
  { fileName: "Songs.png", name: "Songs", tone: "blue", feedback: sampleReviews.creative },
  {
    fileName: "Anniversary_Love.png",
    name: "Anniversary love",
    tone: "rose",
    feedback: sampleReviews.celebration,
  },
  { fileName: "Film.png", name: "Film", tone: "mono", feedback: sampleReviews.creative },
  { fileName: "Birthday_0.png", name: "Birthday", tone: "violet", feedback: sampleReviews.friends },
  { fileName: "Vintage Posts.png", name: "Vintage posts", tone: "amber", feedback: sampleReviews.creative },
  { fileName: "Newspaper.png", name: "Newspaper", tone: "mono", feedback: sampleReviews.creative },
  { fileName: "Memes.png", name: "Memes", tone: "blue", feedback: sampleReviews.friends },
  { fileName: "Teknik.png", name: "Teknik", tone: "blue", feedback: sampleReviews.friends },
  { fileName: "Fakultas_Seni.png", name: "Fakultas seni", tone: "rose", feedback: sampleReviews.creative },
  {
    fileName: "fakultas_olahraga.png",
    name: "Fakultas olahraga",
    tone: "green",
    feedback: sampleReviews.friends,
  },
  {
    fileName: "fakultas_olahraga (2).png",
    name: "Fakultas olahraga / 02",
    tone: "green",
    feedback: sampleReviews.friends,
  },
  { fileName: "Songs (3).png", name: "Songs / 03", tone: "violet", feedback: sampleReviews.creative },
  { fileName: "Songs (4).png", name: "Songs / 04", tone: "blue", feedback: sampleReviews.creative },
  { fileName: "Songs (5).png", name: "Songs / 05", tone: "rose", feedback: sampleReviews.creative },
  { fileName: "Songs (6).png", name: "Songs / 06", tone: "green", feedback: sampleReviews.creative },
  { fileName: "Songs (7).png", name: "Songs / 07", tone: "amber", feedback: sampleReviews.creative },
  { fileName: "ANUAN.png", name: "Anuan", tone: "violet", feedback: sampleReviews.friends },
  { fileName: "2.png", name: "Design / 02", tone: "mono", feedback: sampleReviews.creative },
  { fileName: "4.png", name: "Design / 04", tone: "rose", feedback: sampleReviews.creative },
  { fileName: "18.png", name: "Design / 18", tone: "mono", feedback: sampleReviews.celebration },
  { fileName: "19.png", name: "Design / 19", tone: "amber", feedback: sampleReviews.creative },
  { fileName: "27.png", name: "Design / 27", tone: "blue", feedback: sampleReviews.creative },
];

export const photostripMoments: PhotostripMoment[] = designs.map((design) => ({
  id: design.fileName,
  name: design.name,
  image: {
    src: `/photostrip/${encodeURIComponent(design.fileName)}`,
    alt: `AIBox ${design.name} photostrip design`,
  },
  tone: design.tone,
  feedback: design.feedback,
}));
