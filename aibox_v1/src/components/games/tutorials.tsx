import {
  Bomb, Cherry, Hand, HandFist, HandMetal, Handshake, Pointer, Scissors, ThumbsUp, Timer, Trophy, type LucideIcon,
} from "lucide-react";
import type { GameId, GameSetup } from "../../lib/games/catalog";

export type TutorialStep = { icon: LucideIcon; title: string; text: string };
export type Tutorial = { title: string; intro: string; steps: TutorialStep[] };

export function tutorialFor(id: GameId, setup: GameSetup): Tutorial {
  switch (id) {
    case "suit-arena":
      return {
        title: "Show your sign on SUIT!",
        intro: setup.players === 2 && setup.where === "local"
          ? "Player 1 stands on the left of the frame, Player 2 on the right. Throw your sign when the cue says SUIT!"
          : "Count along with Batu, Gunting, Kertas, then throw your sign on SUIT! Best of three, sudden death on a tie.",
        steps: [
          { icon: HandFist, title: "Batu", text: "Closed fist is rock." },
          { icon: Scissors, title: "Gunting", text: "Peace sign is scissors." },
          { icon: Hand, title: "Kertas", text: "Open palm is paper." },
        ],
      };
    case "irisan-buah":
      return {
        title: "Slice the fruit, spare the sambal",
        intro: setup.players === 2 && setup.where === "local"
          ? "Each player gets a lane. Point with your index finger and swipe through the fruit for 60 seconds."
          : "Point with your index finger and swipe fast through the fruit for 60 seconds. Chain slices for combos.",
        steps: [
          { icon: Pointer, title: "Swipe", text: "Your index fingertip is the blade." },
          { icon: Cherry, title: "Combo", text: "Slice quickly to chain bonus points." },
          { icon: Bomb, title: "Avoid", text: "The sambal bomb costs points." },
        ],
      };
    case "kode-komando":
      return setup.variant === "quiz"
        ? {
            title: "Answer with your hand",
            intro: "Read the question, then hold the sign for your answer for 0.7 seconds to lock it in.",
            steps: [
              { icon: HandFist, title: "A", text: "Closed fist." },
              { icon: Hand, title: "B", text: "Open palm." },
              { icon: Scissors, title: "C", text: "Peace sign." },
              { icon: ThumbsUp, title: "D", text: "Thumbs up." },
            ],
          }
        : {
            title: "Obey the Commander, but only when told",
            intro: "Watch the sequence, then repeat it in order. Hold each sign for half a second. If the Commander does not say it, do not move.",
            steps: [
              { icon: HandMetal, title: "Copy", text: "Repeat the signs in order." },
              { icon: Timer, title: "Hold", text: "Keep each sign for 0.5 s." },
              { icon: Trophy, title: "Survive", text: "Tricks cost a life." },
            ],
          };
    case "tepuk-sinkron":
      return {
        title: setup.where === "remote" ? "A high-five through the screen" : "Practice your timing",
        intro: setup.where === "remote"
          ? "On every beat, raise an open palm into the glowing ring. Your partner's hand appears on the other side. Land it together."
          : "A virtual partner meets you in the middle. Raise an open palm into the ring right on the beat.",
        steps: [
          { icon: Hand, title: "Open palm", text: "Fingers spread, facing the camera." },
          { icon: Timer, title: "On the beat", text: "Within about 0.2 s of the ring closing." },
          { icon: Handshake, title: "Together", text: "Both hands must land to sync." },
        ],
      };
  }
}
