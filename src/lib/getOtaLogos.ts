import fs from 'fs';
import path from 'path';

export function getOtaLogos() {
  const otaDirectory = path.join(process.cwd(), 'public', 'ota');
  let filenames: string[] = [];

  try {
    // Read the directory synchronously. This runs on the server during build/SSR.
    filenames = fs.readdirSync(otaDirectory);
  } catch (error) {
    console.error('Error reading OTA logos directory:', error);
    return [];
  }

  const logos = filenames
    .filter(filename => /\.(png|jpe?g|webp|svg)$/i.test(filename)) // Filter for common image file extensions
    .map(filename => {
      const nameWithoutExt = path.parse(filename).name;
      let alt = nameWithoutExt;

      // Capitalize the first letter of the entire string
      alt = alt.charAt(0).toUpperCase() + alt.slice(1);

      // Specific overrides for common OTA names to ensure correct capitalization/formatting
      if (alt.toLowerCase() === 'mmt') alt = 'MakeMyTrip';
      if (alt.toLowerCase() === 'goibibo') alt = 'Goibibo';
      if (alt.toLowerCase() === 'yatra') alt = 'Yatra';
      if (alt.toLowerCase() === 'expedia') alt = 'Expedia';
      if (alt.toLowerCase() === 'agoda') alt = 'Agoda';
      if (alt.toLowerCase() === 'airbnb') alt = 'Airbnb';
      if (alt.toLowerCase() === 'booking.com') alt = 'Booking.com'; 

      return {
        src: `/ota/${filename}`,
        alt: alt,
      };
    });

  // Sort logos alphabetically by alt text for consistent order
  logos.sort((a, b) => a.alt.localeCompare(b.alt));

  return logos;
}