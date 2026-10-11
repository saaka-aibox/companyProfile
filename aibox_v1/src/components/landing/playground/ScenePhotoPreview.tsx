import Image from "next/image";
import { Camera, Download, Maximize2, X } from "lucide-react";
import { useRef } from "react";
import { getVenue } from "./venue-presets";
import type { ScenePhoto } from "./playground-types";

export function ScenePhotoPreview({ photo }: { photo: ScenePhoto | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <div
      id="playground-photo-preview"
      className={`scene-photo-preview${photo ? " has-photo" : ""}`}
      aria-label="Virtual photo preview"
    >
      {photo ? (
        <>
          <button
            type="button"
            className="scene-photo-thumbnail"
            onClick={() => dialogRef.current?.showModal()}
            aria-label="Enlarge your captured virtual photo"
          >
            <Image
              src={photo.src}
              alt={`Virtual Guest ${photo.guest + 1} photographed in the AIBox ${getVenue(photo.venue).name} scene`}
              width={660}
              height={900}
              unoptimized
            />
            <span>
              <Maximize2 size={12} aria-hidden="true" /> enlarge
            </span>
          </button>
          <div>
            <span className="profile-micro">your moment / virtual photo</span>
            <h3>A little keepsake.</h3>
            <p>
              Guest {String(photo.guest + 1).padStart(2, "0")} · {getVenue(photo.venue).name}
              <br />
              Captured from the booth&apos;s view, with an AIBox frame.
            </p>
            <a
              className="profile-text-link"
              href={photo.src}
              download={`aibox-${photo.venue}-guest-${photo.guest + 1}.png`}
            >
              <Download size={14} aria-hidden="true" /> Download PNG
            </a>
          </div>
          <dialog className="scene-photo-dialog" ref={dialogRef} aria-label="Captured virtual photo">
            <button
              type="button"
              className="scene-photo-close"
              aria-label="Close photo preview"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <Image
              src={photo.src}
              alt="Your framed virtual AIBox photo"
              width={660}
              height={900}
              unoptimized
            />
          </dialog>
        </>
      ) : (
        <>
          <Camera size={26} strokeWidth={1.3} aria-hidden="true" />
          <div>
            <span className="profile-micro">your moment / photo preview</span>
            <h3>Your first moment is waiting.</h3>
            <p>Choose a virtual guest. Send them to the booth. Their framed photo will appear here.</p>
          </div>
        </>
      )}
    </div>
  );
}
