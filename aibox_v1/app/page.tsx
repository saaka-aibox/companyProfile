import { Contact } from "../components/landing/Contact";
import { FAQ } from "../components/landing/FAQ";
import { Footer } from "../components/landing/Footer";
import { Header } from "../components/landing/Header";
import { Hero } from "../components/landing/Hero";
import { MagicBooth } from "../components/landing/MagicBooth";
import { Moments } from "../components/landing/Moments";
import { Pricing } from "../components/landing/Pricing";
import { ProductStory } from "../components/landing/ProductStory";

export default function Home() {
  return <><Header /><main><Hero /><ProductStory /><MagicBooth /><Moments /><FAQ /><Pricing /><Contact /></main><Footer /></>;
}
