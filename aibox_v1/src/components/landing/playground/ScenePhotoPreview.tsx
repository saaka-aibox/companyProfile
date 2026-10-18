import Image from "next/image";
import { Camera, Download, Maximize2, X } from "lucide-react";
import { useRef } from "react";
import { getVenue } from "./venue-presets";
import type { ScenePhoto } from "./playground-types";

export function ScenePhotoPreview({ photo, onClear }: { photo: ScenePhoto | null; onClear?: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cameraPhoto = photo?.source === "camera";
  const description = photo
    ? cameraPhoto
      ? `Your four camera photos in the AIBox ${photo.frameName} photostrip`
      : `Virtual Guest ${photo.guest + 1} photographed in the AIBox ${getVenue(photo.venue).name} scene`
    : "";
  return (
    <div
      id="playground-photo-preview"
      className={`scene-photo-preview${photo ? " has-photo" : ""}`}
      aria-label="Your AIBox photo preview"
    >
      {photo ? (
        <>
          <button
            type="button"
            className="scene-photo-thumbnail"
            onClick={() => dialogRef.current?.showModal()}
            aria-label={
              cameraPhoto ? "Enlarge your camera photostrip" : "Enlarge your captured virtual photo"
            }
          >
            <Image src={photo.src} alt={description} width={photo.width} height={photo.height} unoptimized />
            <span>
              <Maximize2 size={12} aria-hidden="true" /> enlarge
            </span>
          </button>
          <div>
            <span className="profile-micro">
              your moment / {cameraPhoto ? "camera photostrip" : "virtual photo"}
            </span>
            <h3>{cameraPhoto ? "Four moments. All you." : "A little keepsake."}</h3>
            <p>
              {cameraPhoto ? "You / Guest 06" : `Guest ${String(photo.guest + 1).padStart(2, "0")}`} ·{" "}
              {getVenue(photo.venue).name}
              <br />
              {cameraPhoto
                ? `${photo.frameName}. Captured from your camera and composed locally.`
                : "Captured from the booth's view, with an AIBox frame."}
            </p>
            <a
              className="profile-text-link"
              href={photo.src}
              download={`aibox-${photo.venue}-${cameraPhoto ? "my-photostrip" : `guest-${photo.guest + 1}`}.png`}
            >
              <Download size={14} aria-hidden="true" /> Download PNG
            </a>
            {onClear && (
              <button type="button" className="scene-photo-clear" onClick={onClear}>
                Clear this photo
              </button>
            )}
          </div>
          <dialog
            className="scene-photo-dialog"
            ref={dialogRef}
            aria-label={cameraPhoto ? "Your camera photostrip" : "Captured virtual photo"}
          >
            <button
              type="button"
              className="scene-photo-close"
              aria-label="Close photo preview"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <Image src={photo.src} alt={description} width={photo.width} height={photo.height} unoptimized />
          </dialog>
        </>
      ) : (
        <>
          <Camera size={26} strokeWidth={1.3} aria-hidden="true" />
          <div>
            <span className="profile-micro">your moment / photo preview</span>
            <h3>Your first moment is waiting.</h3>
            <p>
              Join as Guest 06, enable your camera, and take four peace-sign photos. Your AIBox photostrip
              will appear here.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
