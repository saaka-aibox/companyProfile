import { GAME_IDS, type GameId } from "../room/protocol";

export { GAME_IDS };
export type { GameId };

export type GameInfo = {
  id: GameId;
  name: string;
  subtitle: string;
  blurb: string;
  players: string;
  duration: string;
  modes: string[];
  gestures: string[];
  /** Remote play through a game room. */
  remote: boolean;
  /** Remote needs exactly this many devices (otherwise 2 to max). */
  remoteDevices: string;
  photo: string;
};

export const GAMES: Record<GameId, GameInfo> = {
  "suit-arena": {
    id: "suit-arena",
    name: "Suit Arena",
    subtitle: "Rock, paper, scissors with your hand",
    blurb: "Show batu, gunting or kertas on the cue. Best of three, sudden death on a tie.",
    players: "1-2 on one camera, or 1v1 online",
    duration: "About 2 min",
    modes: ["vs CPU", "2 players", "Online 1v1"],
    gestures: ["fist", "peace", "palm"],
    remote: true,
    remoteDevices: "2 devices",
    photo: "Freeze frame at the reveal with a WIN or LOSE stamp",
  },
  "irisan-buah": {
    id: "irisan-buah",
    name: "Irisan Buah",
    subtitle: "Slice Indonesian fruit, dodge the sambal bomb",
    blurb: "Swipe your index finger through mangga, rambutan, nanas, manggis and salak for 60 seconds.",
    players: "1-2 on one camera, or a score race online",
    duration: "60 sec",
    modes: ["Solo", "2 lanes", "Online race"],
    gestures: ["point"],
    remote: true,
    remoteDevices: "2-4 devices",
    photo: "Your combo peak with a juice splash",
  },
  "kode-komando": {
    id: "kode-komando",
    name: "Kode Komando",
    subtitle: "Simon Says with hand signs, plus a quiz",
    blurb: "Copy the commander's hand signs in order. Watch for tricks: only obey when the commander says so.",
    players: "1-2 on one camera",
    duration: "2-4 min",
    modes: ["Simon Says", "Kuis Isyarat quiz"],
    gestures: ["fist", "palm", "peace", "thumb"],
    remote: false,
    remoteDevices: "Local only",
    photo: "The survivors' podium shot",
  },
  "tepuk-sinkron": {
    id: "tepuk-sinkron",
    name: "Tepuk Sinkron",
    subtitle: "A high-five through the screen",
    blurb: "You and a friend raise open palms into the target on the beat. Land it together to sync up.",
    players: "2 devices, or practice solo",
    duration: "About 1 min",
    modes: ["Online duo", "Practice"],
    gestures: ["palm"],
    remote: true,
    remoteDevices: "2 devices",
    photo: "A split frame with both hands meeting at the seam",
  },
};

export const GAME_LIST: GameInfo[] = GAME_IDS.map((id) => GAMES[id]);

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value);
}

/** Setup chosen in the mode chooser. */
export type GameSetup = {
  /** Where the players are. */
  where: "local" | "remote";
  /** Local players sharing one camera (1-2). In remote mode this is always 1 per device. */
  players: 1 | 2;
  /** Game specific variant, e.g. "cpu", "pvp", "simon", "quiz", "practice". */
  variant: string;
};

export type LocalMode = { id: string; label: string; desc: string; players: 1 | 2; variant: string };
export const LOCAL_MODES: Record<GameId, LocalMode[]> = {
  "suit-arena": [
    { id: "cpu", label: "vs CPU", desc: "One player against the bot.", players: 1, variant: "cpu" },
    { id: "pvp", label: "2 players", desc: "Left and right zones on one camera.", players: 2, variant: "pvp" },
  ],
  "irisan-buah": [
    { id: "solo", label: "Solo", desc: "One player, 60 seconds.", players: 1, variant: "solo" },
    { id: "lanes", label: "2 lanes", desc: "Two players, one lane each.", players: 2, variant: "lanes" },
  ],
  "kode-komando": [
    { id: "simon1", label: "Simon Says", desc: "Copy the Commander. 1 player.", players: 1, variant: "simon" },
    { id: "simon2", label: "Simon Says duel", desc: "Last one standing. 2 players.", players: 2, variant: "simon" },
    { id: "quiz1", label: "Kuis Isyarat", desc: "Answer AI Box trivia with signs. 1 player.", players: 1, variant: "quiz" },
    { id: "quiz2", label: "Kuis duel", desc: "Trivia head to head. 2 players.", players: 2, variant: "quiz" },
  ],
  "tepuk-sinkron": [
    { id: "practice", label: "Practice", desc: "Solo run with a virtual partner.", players: 1, variant: "practice" },
  ],
};
