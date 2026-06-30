export function useMap() {
  const getStaticMap = async (lat: number, lng: number) => {
    const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x400&markers=${lat},${lng},red`;

    const response = await fetch(url);
    const blob = await response.blob();

    return URL.createObjectURL(blob);
  };

  return { getStaticMap };
}
