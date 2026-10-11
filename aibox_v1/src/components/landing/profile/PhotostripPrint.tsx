import Image from "next/image";
import type { PhotostripMoment } from "./photostrip-moments";

/** Show the supplied print in full; its frame is already part of the artwork. */
export function PhotostripPrint({
  moment,
  sizes = "(max-width: 760px) 260px, 300px",
}: {
  moment: PhotostripMoment;
  sizes?: string;
}) {
  return (
    <span className="moment-photostrip">
      <Image
        src={moment.image.src}
        alt={moment.image.alt}
        width={1200}
        height={1800}
        sizes={sizes}
        loading="lazy"
        draggable={false}
      />
    </span>
  );
}
