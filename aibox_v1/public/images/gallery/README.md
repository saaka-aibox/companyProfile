# Gallery portrait previews

Generated with the built-in imagegen tool on 2026-10-04. All people are fictional. These assets illustrate the gallery before real customer photos are available. Keep the “AI-generated preview” label until a sample is replaced with an approved customer photo.

Delivery assets are compressed WebP files. The original generated PNGs are preserved in the generator output folder. Frames and animated ornaments are native CSS/SVG, allowing the website to style them independently of the portraits.

## Updating the collection

Edit `src/components/landing/profile/gallery-moments.ts` to add or replace entries. Update the image path and alt text; set the photo `source` to `customer` for approved AIBox photos. Optional `feedback` contains a quote, attribution, and its own `source` (`sample` or `customer`). Current quotes are illustrative copy, labeled as sample reviews on each card back. Replace them with approved customer quotes and set feedback `source` to `customer` when available.

The homepage displays the continuous photo strip with hover/tap review cards. Gallery retains a deliberate frame picker. Repeated strips are visual loop fillers; only one set of cards appears in keyboard and screen-reader navigation. Auto scrolling pauses for card hover, an open review, keyboard interaction, reduced-motion preferences, an explicit Pause button, or an offscreen/hidden page.

## Prompt set

### afterglow-couple.webp

Use case: photorealistic-natural. Asset type: sample portrait for the AIBox photobooth result carousel; the website adds its own frame. Create one square, high-quality photobooth photograph of a happy Indonesian adult couple in their late twenties, at an elegant evening celebration. Both face the camera, one laughing and one giving a small peace sign, natural joyful candid expressions. Chest-up portrait with both complete heads and hands comfortably within the center 80 percent of the image. Soft flattering direct camera/ring lighting, warm champagne and amber bokeh, subtle dark brown backdrop, natural skin pores and fabric texture, refined editorial color grading. Looks like an actual flattering booth photo, camera eye-level, 50mm feel. No booth equipment visible, no text, no watermark, no borders or frame, no collage. Only two fictional adult people, anatomically correct hands.

### blue-hour-friends.webp

Use case: photorealistic-natural. Asset type: sample portrait for the AIBox photobooth result carousel; the website adds its own frame. Create one square, high-quality photobooth photograph of three Indonesian adult friends in their twenties having fun at a creative launch party. Two women and one man in contemporary casual smart clothing with navy and cream accents. They face the camera, shoulders touching, one making a small heart with fingers, the others smiling naturally. Chest-up, all heads and hands inside the central 80 percent. Professional soft front-facing ring lighting, subtle blue-hour cool lighting on the dark cobalt background with sparse warm party bokeh. Realistic skin and clothing textures, premium editorial photography, 50mm eye-level lens. No text, no watermark, no frame, no border, no collage, no visible booth equipment. Only three fictional adult people, believable anatomical hands.

### soft-focus-celebration.webp

Use case: photorealistic-natural. Asset type: sample portrait for the AIBox photobooth result carousel; the website adds its own frame. Create one square high-quality photobooth photograph of two Indonesian adult women in their late twenties celebrating a friend's wedding, elegant contemporary blush and burgundy dresses. They are facing the camera, one gently leans her head toward the other, both sharing an unforced delighted laugh; hands casually out of view. Chest-up with complete heads in the middle 80 percent of the photograph. Soft professional front-facing booth light, warm ivory studio backdrop with a hint of blush florals out of focus at the edges. Natural realistic skin texture, distinct facial features, refined warm editorial color grading. Eye-level 50mm camera feel. No words, no text, no watermark, no collage, no decorative border, no frame, no photobooth hardware visible. Two fictional adult people only.
