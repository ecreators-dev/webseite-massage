// Holt Annas Google-Bewertungen ueber die Places API.
//
// Laeuft auf dem Server, damit der API-Schluessel nicht im Browser landet.
// Beide Werte stehen in den Netlify-Umgebungsvariablen, nicht im Code:
//   GOOGLE_MAPS_API_KEY   Schluessel aus der Google Cloud Console
//   GOOGLE_PLACE_ID       Place-ID von Annas Unternehmensprofil
//
// Die Antwort wird einen Tag lang im Netlify-Cache gehalten: Google wird also
// hoechstens einmal taeglich gefragt, egal wie viele Besucher die Seite hat.
//
// Grenze der Places API: hoechstens 5 Bewertungen, von Google ausgewaehlt,
// und ohne Annas Antworten - die gibt es dort schlicht nicht.

export default async () => {
  const key = Netlify.env.get('GOOGLE_MAPS_API_KEY');
  const place = Netlify.env.get('GOOGLE_PLACE_ID');
  if (!key || !place) return Response.json({ reviews: [] }, { status: 200 });

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place)}?languageCode=de`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews'
      }
    });
    if (!res.ok) throw new Error(`Places API ${res.status}`);
    const d = await res.json();

    // Nur das weitergeben, was die Seite anzeigt - keine Rohdaten an den Browser.
    const daten = {
      rating: d.rating ?? null,
      anzahl: d.userRatingCount ?? null,
      url: d.googleMapsUri ?? null,
      reviews: (d.reviews || [])
        .filter((r) => r.rating >= 4 && (r.text?.text || r.originalText?.text))
        .map((r) => ({
          name: r.authorAttribution?.displayName || 'Gast',
          foto: r.authorAttribution?.photoUri || null,
          sterne: r.rating,
          wann: r.relativePublishTimeDescription || '',
          text: (r.text?.text || r.originalText?.text || '').trim()
        }))
    };

    return Response.json(daten, {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' }
    });
  } catch (e) {
    // Keine Bewertungen ist kein Fehler fuer den Besucher - der Bereich bleibt
    // dann einfach leer, der Rest der Seite laeuft weiter.
    return Response.json({ reviews: [] }, { status: 200 });
  }
};
