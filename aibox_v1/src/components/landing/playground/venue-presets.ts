export const venuePresets = [
  { id: "studio", name: "Studio", description: "A clean view of the booth.", image: null, rotation: 0, light: "#e6f1ff", atmosphere: "none" },
  { id: "wedding", name: "Wedding", description: "Chandelier light, a ballroom, and a little celebration.", image: "/environments/ballroom.webp", rotation: 1.1, light: "#ffe3ba", atmosphere: "petals" },
  { id: "coffee", name: "Coffee shop", description: "A warm hospitality setting for everyday moments.", image: "/environments/bush_restaurant.webp", rotation: 2.6, light: "#ffd6ad", atmosphere: "dust" },
  { id: "launch", name: "Creative launch", description: "An airy studio setting for a brand gathering.", image: "/environments/photo_studio_broadway_hall.webp", rotation: -.5, light: "#e2edff", atmosphere: "lights" },
] as const;

export type VenueId = typeof venuePresets[number]["id"];
export type VenuePreset = typeof venuePresets[number];
export function getVenue(id: VenueId) { return venuePresets.find(venue => venue.id === id) ?? venuePresets[0]; }
