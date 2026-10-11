export const venuePresets = [
  {
    id: "studio",
    name: "Studio",
    description: "Softboxes, a paper backdrop, and your own little photo session.",
    guests: 4,
    light: "#edf4ff",
    frame: "#e6edf6",
    frameInk: "#203b5b",
  },
  {
    id: "wedding",
    name: "Wedding",
    description: "Florals, linen, and a garden celebration worth remembering.",
    guests: 6,
    light: "#fff0db",
    frame: "#f1e1ce",
    frameInk: "#594538",
  },
  {
    id: "coffee",
    name: "Coffee shop",
    description: "Warm timber, window light, and a photo with your coffee.",
    guests: 5,
    light: "#ffeddb",
    frame: "#d9b78e",
    frameInk: "#392b22",
  },
  {
    id: "launch",
    name: "Creative launch",
    description: "A branded stage and a photo moment for the whole gathering.",
    guests: 6,
    light: "#e7eeff",
    frame: "#254d8c",
    frameInk: "#ffffff",
  },
] as const;

export type VenueId = (typeof venuePresets)[number]["id"];
export type VenuePreset = (typeof venuePresets)[number];
export function getVenue(id: VenueId) {
  return venuePresets.find((venue) => venue.id === id) ?? venuePresets[0];
}
