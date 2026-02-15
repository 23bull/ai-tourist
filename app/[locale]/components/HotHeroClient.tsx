"use client";

export function HotHeroClient({ mapsUrl }: { mapsUrl: string }) {
  return (
    <div className="heroCTArow">
      <a className="pill pillPrimary" href={mapsUrl} target="_blank" rel="noreferrer">
        Öppna i Maps
      </a>
      <button className="pill" onClick={() => alert("Sparad (mock)")}>Spara</button>
      <button className="pill" onClick={() => alert("Inte nu (mock)")}>Inte nu</button>
    </div>
  );
}