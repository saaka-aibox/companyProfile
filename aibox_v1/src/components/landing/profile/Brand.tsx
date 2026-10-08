import Image from "next/image";
import Link from "next/link";

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link className={`profile-brand${inverted ? " is-inverted" : ""}`} href="/" aria-label="AIBox home">
      <Image src={inverted ? "/logow.png" : "/logo.png"} alt="AIBox" width={150} height={40} sizes="150px" />
    </Link>
  );
}
