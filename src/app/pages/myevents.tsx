import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";

type MyEvent = {
  id: string | number;
  title: string;
  date: string;
  location?: string | null;
  created_at?: string | null;
  creator_id?: number | string | null;
  image_url?: string | null;
  image?: string | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80";

export function MyEvents() {
  const { token, user, isLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  async function loadMyEvents(currentUserId?: number) {
    if (!currentUserId) {
      setEvents([]);
      setLoadingEvents(false);
      return;
    }

    try {
      setLoadingEvents(true);
      const response = await fetch("/api/events");
      if (!response.ok) {
        throw new Error("Nie udalo sie pobrac wydarzen");
      }

      const data = (await response.json()) as MyEvent[];
      const own = data
        .filter((event) => Number(event.creator_id) === Number(currentUserId))
        .sort((a, b) => {
          const aTime = Date.parse(a.created_at || a.date || "");
          const bTime = Date.parse(b.created_at || b.date || "");
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });

      setEvents(own);
    } catch (error) {
      console.error(error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    loadMyEvents(user?.userId);
  }, [user?.userId]);

  const canSubmit = useMemo(
    () => !!title.trim() && !!description.trim() && !!location.trim() && !!date && !!token,
    [title, description, location, date, token]
  );

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();

    const authToken = token ?? localStorage.getItem("token");
    if (!authToken) {
      alert("Musisz byc zalogowany, aby dodawac wydarzenia.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title,
          description,
          location,
          date,
          imageUrl,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error ?? "Nie udalo sie utworzyc wydarzenia.");
        return;
      }

      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
      setImageUrl("");
      await loadMyEvents(user?.userId);
      alert("Wydarzenie zostalo dodane.");
    } catch (error) {
      console.error(error);
      alert("Wystapil blad podczas tworzenia wydarzenia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <p className="text-gray-500">Ladowanie...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Moje wydarzenia</h1>
        <p className="text-gray-600">Musisz byc zalogowany, aby dodawac wydarzenia.</p>
        <Link to="/login" className="inline-block rounded-md bg-black px-4 py-2 text-white">
          Przejdz do logowania
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Moje wydarzenia</h1>
        <p className="text-gray-600">Dodaj nowe wydarzenie. Bedzie widoczne na stronie glownej i liscie wszystkich wydarzen.</p>
      </section>

      <section className="border rounded-lg p-6 bg-white">
        <h2 className="text-lg font-medium mb-4">Nowe wydarzenie</h2>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tytul wydarzenia"
            className="w-full border rounded-md p-2"
            required
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opis wydarzenia"
            className="w-full border rounded-md p-2 min-h-28"
            required
          />

          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Lokalizacja"
            className="w-full border rounded-md p-2"
            required
          />

          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-md p-2"
            required
          />

          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Link do obrazka (np. Imgur)"
            className="w-full border rounded-md p-2"
          />

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Zapisywanie..." : "Dodaj wydarzenie"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Twoje dodane wydarzenia</h2>

        {loadingEvents && <p className="text-gray-500">Ladowanie wydarzen...</p>}

        {!loadingEvents && events.length === 0 && (
          <div className="border rounded-lg p-6 text-gray-500">Nie dodales jeszcze zadnego wydarzenia.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!loadingEvents &&
            events.map((event) => {
              const createdAt = new Date(event.created_at || event.date || "");
              const createdLabel = Number.isNaN(createdAt.getTime())
                ? "Brak daty"
                : createdAt.toLocaleDateString("pl-PL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });

              return (
                <article key={String(event.id)} className="border rounded-lg overflow-hidden bg-white">
                  <img
                    src={event.image_url || event.image || fallbackImage}
                    alt={event.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4 space-y-2">
                    <h3 className="font-medium text-lg">{event.title}</h3>
                    <p className="text-sm text-gray-600">{event.location || "Brak lokalizacji"}</p>
                    <p className="text-xs text-gray-500">Dodane: {createdLabel}</p>
                  </div>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
}