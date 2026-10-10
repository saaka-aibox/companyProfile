export const venuePresets = [
  { id: "studio", name: "Studio", description: "An open studio. A few guests, one good moment.", guests: 4, light: "#edf4ff" },
  { id: "wedding", name: "Wedding", description: "A garden celebration, with guests finding their way to the booth.", guests: 6, light: "#fff0db" },
  { id: "coffee", name: "Coffee shop", description: "Coffee, conversation, and a photo to take away.", guests: 5, light: "#ffeddb" },
  { id: "launch", name: "Creative launch", description: "A small gathering with room for a big idea.", guests: 6, light: "#e7eeff" },
] as const;

export type VenueId = typeof venuePresets[number]["id"];
export type VenuePreset = typeof venuePresets[number];
export function getVenue(id: VenueId) { return venuePresets.find(venue => venue.id === id) ?? venuePresets[0]; }
