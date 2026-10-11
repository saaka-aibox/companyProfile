import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="profile-brand" href="/" aria-label="AIBox home">
      <Image src="/logo.png" alt="AIBox" width={150} height={40} sizes="138px" />
    </Link>
  );
}
