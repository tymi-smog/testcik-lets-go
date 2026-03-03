import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";

type MyEvent = {
  id: string | number;
  title: string;
  description?: string | null;
  date: string;
  location?: string | null;
  created_at?: string | null;
  creator_id?: number | string | null;
  creator_username?: string | null;
  image_url?: string | null;
  image?: string | null;
  ticketTypes?: Array<{
    id?: string | number;
    name: string;
    price: number | string;
    available: number | string;
    description?: string | null;
  }>;
};

type TicketDraft = {
  name: string;
  price: string;
  available: string;
  description: string;
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
  const [ticketTypes, setTicketTypes] = useState<TicketDraft[]>([
    { name: "", price: "", available: "", description: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
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
      const visible = data
        .filter((event) => (user?.is_admin ? true : Number(event.creator_id) === Number(currentUserId)))
        .sort((a, b) => {
          const aTime = Date.parse(a.created_at || a.date || "");
          const bTime = Date.parse(b.created_at || b.date || "");
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });

      setEvents(visible);
    } catch (error) {
      console.error(error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    loadMyEvents(user?.userId);
  }, [user?.userId, user?.is_admin]);

  const hasValidTickets = useMemo(
    () =>
      ticketTypes.length > 0 &&
      ticketTypes.every((ticket) => {
        const price = Number(ticket.price);
        const available = Number(ticket.available);
        return (
          !!ticket.name.trim() &&
          Number.isFinite(price) &&
          price >= 0 &&
          Number.isFinite(available) &&
          available >= 1
        );
      }),
    [ticketTypes]
  );

  const canSubmit = useMemo(
    () =>
      !!title.trim() &&
      !!description.trim() &&
      !!location.trim() &&
      !!date &&
      !!token &&
      hasValidTickets,
    [title, description, location, date, token, hasValidTickets]
  );

  function addTicketRow() {
    setTicketTypes((prev) => [...prev, { name: "", price: "", available: "", description: "" }]);
  }

  function removeTicketRow(index: number) {
    setTicketTypes((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }

  function updateTicketRow(index: number, field: keyof TicketDraft, value: string) {
    setTicketTypes((prev) =>
      prev.map((ticket, idx) => (idx === index ? { ...ticket, [field]: value } : ticket))
    );
  }

  function startEditing(event: MyEvent) {
    setEditingEventId(String(event.id));
    setTitle(event.title || "");
    setDescription(event.description || "");
    setLocation(event.location || "");

    const eventDate = event.date ? new Date(event.date) : null;
    if (eventDate && !Number.isNaN(eventDate.getTime())) {
      const local = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000);
      setDate(local.toISOString().slice(0, 16));
    } else {
      setDate("");
    }

    setImageUrl(event.image_url || "");

    const mappedTickets =
      event.ticketTypes?.map((ticket) => ({
        name: String(ticket.name ?? ""),
        price: String(ticket.price ?? ""),
        available: String(ticket.available ?? ""),
        description: String(ticket.description ?? ""),
      })) ?? [];

    setTicketTypes(mappedTickets.length ? mappedTickets : [{ name: "", price: "", available: "", description: "" }]);
  }

  function clearForm() {
    setEditingEventId(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setDate("");
    setImageUrl("");
    setTicketTypes([{ name: "", price: "", available: "", description: "" }]);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();

    const authToken = token ?? localStorage.getItem("token");
    if (!authToken) {
      alert("Musisz byc zalogowany, aby dodawac wydarzenia.");
      return;
    }

    setSubmitting(true);

    try {
      const endpoint = editingEventId ? `/api/events?id=${editingEventId}` : "/api/events";
      const method = editingEventId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
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
          ticketTypes: ticketTypes.map((ticket) => ({
            name: ticket.name.trim(),
            price: Number(ticket.price),
            available: Number(ticket.available),
            description: ticket.description.trim(),
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error ?? "Nie udalo sie utworzyc wydarzenia.");
        return;
      }

      clearForm();
      await loadMyEvents(user?.userId);
      alert(editingEventId ? "Wydarzenie zostalo zaktualizowane." : "Wydarzenie zostalo dodane.");
    } catch (error) {
      console.error(error);
      alert("Wystapil blad podczas zapisu wydarzenia.");
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
        <p className="text-gray-600">
          {user.is_admin
            ? "Jako admin mozesz edytowac wszystkie wydarzenia."
            : "Dodaj nowe wydarzenie. Bedzie widoczne na stronie glownej i liscie wszystkich wydarzen."}
        </p>
      </section>

      <section className="border rounded-lg p-6 bg-white">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{editingEventId ? "Edycja wydarzenia" : "Nowe wydarzenie"}</h2>
          {editingEventId && (
            <button
              type="button"
              onClick={clearForm}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              Anuluj edycje
            </button>
          )}
        </div>

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

          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Typy biletow</h3>
              <button
                type="button"
                onClick={addTicketRow}
                className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100"
              >
                Dodaj typ
              </button>
            </div>

            {ticketTypes.map((ticket, index) => (
              <div key={index} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Bilet {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeTicketRow(index)}
                    disabled={ticketTypes.length === 1}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                  >
                    Usun
                  </button>
                </div>

                <input
                  type="text"
                  value={ticket.name}
                  onChange={(e) => updateTicketRow(index, "name", e.target.value)}
                  placeholder="Nazwa biletu"
                  className="w-full border rounded-md p-2"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticket.price}
                    onChange={(e) => updateTicketRow(index, "price", e.target.value)}
                    placeholder="Cena"
                    className="w-full border rounded-md p-2"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={ticket.available}
                    onChange={(e) => updateTicketRow(index, "available", e.target.value)}
                    placeholder="Ilosc"
                    className="w-full border rounded-md p-2"
                    required
                  />
                </div>

                <textarea
                  value={ticket.description}
                  onChange={(e) => updateTicketRow(index, "description", e.target.value)}
                  placeholder="Opis biletu"
                  className="w-full border rounded-md p-2 min-h-20"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Zapisywanie..." : editingEventId ? "Zapisz zmiany" : "Dodaj wydarzenie"}
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
                    {user.is_admin && (
                      <p className="text-xs text-gray-500">
                        Autor: {event.creator_username || "Nieznany"} (ID: {event.creator_id ?? "?"})
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Dodane: {createdLabel}</p>
                    <button
                      type="button"
                      onClick={() => startEditing(event)}
                      className="mt-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Edytuj
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
}
