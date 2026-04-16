import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";

type MyEvent = {
  id: string | number;
  title: string;
  category?: string | null;
  description?: string | null;
  date: string;
  location?: string | null;
  city?: string | null;
  venue?: string | null;
  created_at?: string | null;
  creator_id?: number | string | null;
  creator_username?: string | null;
  image_url?: string | null;
  image?: string | null;
  sold_tickets?: number | string | null;
  ticketTypes?: Array<{
    id?: string | number;
    name: string;
    price: number | string;
    available: number | string;
    sold?: number | string | null;
    initial_available?: number | string | null;
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

type SortOption =
  | "priceAsc"
  | "priceDesc"
  | "typeAsc"
  | "availableAsc"
  | "availableDesc"
  | "soldAsc"
  | "soldDesc"
  | "dateAsc"
  | "dateDesc"
  | "createdDesc";

function getMyEventStats(event: MyEvent) {
  const tickets = event.ticketTypes ?? [];
  const minTicketPrice = tickets.length
    ? Math.min(...tickets.map((ticket) => Number(ticket.price)))
    : 0;
  const totalTicketsCount = tickets.reduce((sum, ticket) => {
    const available = Number(ticket.available ?? 0);
    return sum + (Number.isFinite(available) ? available : 0);
  }, 0);
  const eventSoldTickets = Number(event.sold_tickets);
  const totalSoldCount =
    Number.isFinite(eventSoldTickets) && eventSoldTickets >= 0
      ? eventSoldTickets
      : tickets.reduce((sum, ticket) => {
          const sold = Number(ticket.sold);
          if (Number.isFinite(sold) && sold >= 0) {
            return sum + sold;
          }
          const initialAvailable = Number(ticket.initial_available);
          const available = Number(ticket.available ?? 0);
          if (Number.isFinite(initialAvailable) && Number.isFinite(available)) {
            return sum + Math.max(initialAvailable - available, 0);
          }
          return sum;
        }, 0);

  return {
    minTicketPrice: Number.isFinite(minTicketPrice) ? minTicketPrice : 0,
    totalTicketsCount,
    totalSoldCount,
  };
}

export function MyEvents() {
  const { token, user, isLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ticketTypes, setTicketTypes] = useState<TicketDraft[]>([
    { name: "", price: "", available: "", description: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("dateAsc");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [soldFrom, setSoldFrom] = useState("");
  const [soldTo, setSoldTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Wszystkie");
  const [locationFilter, setLocationFilter] = useState("Wszystkie");

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
        throw new Error("Nie udało się pobrać wydarzeń");
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

  const categories = useMemo(() => {
    const unique = [...new Set(events.map((event) => event.category || "Inne"))];
    return ["Wszystkie", ...unique];
  }, [events]);

  const locations = useMemo(() => {
    const unique = [
      ...new Set(events.map((event) => event.city || "Brak miasta").filter(Boolean)),
    ];
    return ["Wszystkie", ...unique];
  }, [events]);

  useEffect(() => {
    if (!categories.includes(categoryFilter)) {
      setCategoryFilter("Wszystkie");
    }
  }, [categories, categoryFilter]);

  useEffect(() => {
    if (!locations.includes(locationFilter)) {
      setLocationFilter("Wszystkie");
    }
  }, [locations, locationFilter]);

  const processedEvents = useMemo(() => {
    const priceFromNumber = priceFrom === "" ? null : Number(priceFrom);
    const priceToNumber = priceTo === "" ? null : Number(priceTo);
    const availableFromNumber = availableFrom === "" ? null : Number(availableFrom);
    const availableToNumber = availableTo === "" ? null : Number(availableTo);
    const soldFromNumber = soldFrom === "" ? null : Number(soldFrom);
    const soldToNumber = soldTo === "" ? null : Number(soldTo);

    const filtered = events.filter((event) => {
      const stats = getMyEventStats(event);
      const category = event.category || "Inne";
      const location = event.city || "Brak miasta";
      const matchesCategory = categoryFilter === "Wszystkie" || category === categoryFilter;
      const matchesLocation = locationFilter === "Wszystkie" || location === locationFilter;
      const matchesPriceFrom = priceFromNumber === null || stats.minTicketPrice >= priceFromNumber;
      const matchesPriceTo = priceToNumber === null || stats.minTicketPrice <= priceToNumber;
      const matchesAvailableFrom =
        availableFromNumber === null || stats.totalTicketsCount >= availableFromNumber;
      const matchesAvailableTo =
        availableToNumber === null || stats.totalTicketsCount <= availableToNumber;
      const matchesSoldFrom = soldFromNumber === null || stats.totalSoldCount >= soldFromNumber;
      const matchesSoldTo = soldToNumber === null || stats.totalSoldCount <= soldToNumber;

      return (
        matchesCategory &&
        matchesLocation &&
        matchesPriceFrom &&
        matchesPriceTo &&
        matchesAvailableFrom &&
        matchesAvailableTo &&
        matchesSoldFrom &&
        matchesSoldTo
      );
    });

    return [...filtered].sort((a, b) => {
      const aStats = getMyEventStats(a);
      const bStats = getMyEventStats(b);
      const aDate = Date.parse(a.date);
      const bDate = Date.parse(b.date);
      const aCreated = Date.parse(a.created_at || a.date || "");
      const bCreated = Date.parse(b.created_at || b.date || "");
      const now = Date.now();
      const aCategory = a.category || "Inne";
      const bCategory = b.category || "Inne";

      switch (sortBy) {
        case "priceAsc":
          return aStats.minTicketPrice - bStats.minTicketPrice;
        case "priceDesc":
          return bStats.minTicketPrice - aStats.minTicketPrice;
        case "typeAsc":
          return aCategory.localeCompare(bCategory, "pl");
        case "availableAsc":
          return aStats.totalTicketsCount - bStats.totalTicketsCount;
        case "availableDesc":
          return bStats.totalTicketsCount - aStats.totalTicketsCount;
        case "soldAsc":
          return aStats.totalSoldCount - bStats.totalSoldCount;
        case "soldDesc":
          return bStats.totalSoldCount - aStats.totalSoldCount;
        case "dateAsc":
          return Math.abs((Number.isNaN(aDate) ? 0 : aDate) - now) - Math.abs((Number.isNaN(bDate) ? 0 : bDate) - now);
        case "dateDesc":
          return Math.abs((Number.isNaN(bDate) ? 0 : bDate) - now) - Math.abs((Number.isNaN(aDate) ? 0 : aDate) - now);
        case "createdDesc":
          return (Number.isNaN(bCreated) ? 0 : bCreated) - (Number.isNaN(aCreated) ? 0 : aCreated);
        default:
          return 0;
      }
    });
  }, [
    events,
    sortBy,
    categoryFilter,
    locationFilter,
    priceFrom,
    priceTo,
    availableFrom,
    availableTo,
    soldFrom,
    soldTo,
  ]);

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
      !!city.trim() &&
      !!venue.trim() &&
      !!date &&
      !!token &&
      hasValidTickets,
    [title, description, city, venue, date, token, hasValidTickets]
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
    const fallbackLocation = String(event.location || "");
    if (event.city || event.venue) {
      setCity(event.city || "");
      setVenue(event.venue || fallbackLocation);
    } else if (fallbackLocation.includes(",")) {
      const split = fallbackLocation.split(",");
      setVenue(split.slice(0, split.length - 1).join(",").trim());
      setCity(split[split.length - 1].trim());
    } else {
      setVenue(fallbackLocation);
      setCity("");
    }

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
    setCity("");
    setVenue("");
    setDate("");
    setImageUrl("");
    setTicketTypes([{ name: "", price: "", available: "", description: "" }]);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();

    const authToken = token ?? localStorage.getItem("token");
    if (!authToken) {
      alert("Musisz być zalogowany, aby dodawać wydarzenia.");
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
          city,
          venue,
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
        alert(data?.error ?? "Nie udało się utworzyć wydarzenia.");
        return;
      }

      clearForm();
      await loadMyEvents(user?.userId);
      alert(editingEventId ? "Wydarzenie zostało zaktualizowane." : "Wydarzenie zostało dodane.");
    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd podczas zapisu wydarzenia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Moje wydarzenia</h1>
        <p className="text-gray-600">Musisz być zalogowany, aby dodawać wydarzenia.</p>
        <Link to="/login" className="inline-block rounded-md bg-black px-4 py-2 text-white">
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  if (!user.is_verified) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-xl text-center space-y-3">
          <h1 className="text-2xl font-semibold">Weryfikacja konta jest wymagana</h1>
          <p className="text-gray-600">
            Aby tworzyć nowe wydarzenia, najpierw zweryfikuj swój adres e-mail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Moje wydarzenia</h1>
        <p className="text-gray-600">
          {user.is_admin
            ? "Jako admin możesz edytować wszystkie wydarzenia."
            : "Dodaj nowe wydarzenie. Będzie widoczne na stronie głównej i liście wszystkich wydarzeń."}
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
              Anuluj edycję
            </button>
          )}
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tytuł wydarzenia"
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
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Lokalizacja (np. AmberExpo)"
            className="w-full border rounded-md p-2"
            required
          />

          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Miasto"
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
              <h3 className="font-medium">Typy biletów</h3>
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
                    Usuń
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
                    placeholder="Ilość"
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
        <div className="rounded-lg border bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border rounded-md px-3 py-2"
            >
              <option value="dateAsc">Data: od najbliższych</option>
              <option value="dateDesc">Data: od najdalszych w czasie</option>
              <option value="createdDesc">Ostatnio dodane</option>
              <option value="priceAsc">Cena biletu: rosnąco</option>
              <option value="priceDesc">Cena biletu: malejąco</option>
              <option value="typeAsc">Rodzaj: alfabetycznie</option>
              <option value="availableAsc">Dostępne bilety: rosnąco</option>
              <option value="availableDesc">Dostępne bilety: malejąco</option>
              <option value="soldAsc">Sprzedane bilety: rosnąco</option>
              <option value="soldDesc">Sprzedane bilety: malejąco</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cena od"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cena do"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Dostępne bilety od"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Dostępne bilety do"
              value={availableTo}
              onChange={(e) => setAvailableTo(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Sprzedane bilety od"
              value={soldFrom}
              onChange={(e) => setSoldFrom(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Sprzedane bilety do"
              value={soldTo}
              onChange={(e) => setSoldTo(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <button
              type="button"
              onClick={() => {
                setSortBy("dateAsc");
                setCategoryFilter("Wszystkie");
                setLocationFilter("Wszystkie");
                setPriceFrom("");
                setPriceTo("");
                setAvailableFrom("");
                setAvailableTo("");
                setSoldFrom("");
                setSoldTo("");
              }}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            >
              Wyczyść filtry
            </button>
          </div>
        </div>

        {loadingEvents && <p className="text-gray-500">Ładowanie wydarzeń...</p>}

        {!loadingEvents && events.length === 0 && (
          <div className="border rounded-lg p-6 text-gray-500">Nie dodałeś jeszcze żadnego wydarzenia.</div>
        )}
        {!loadingEvents && events.length > 0 && processedEvents.length === 0 && (
          <div className="border rounded-lg p-6 text-gray-500">Brak wydarzeń dla wybranych filtrów.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!loadingEvents &&
            processedEvents.map((event) => {
              const { minTicketPrice, totalTicketsCount, totalSoldCount } = getMyEventStats(event);
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
                    <p className="text-sm text-gray-600">{event.category || "Inne"}</p>
                    <p className="text-sm text-gray-600">
                      Od {minTicketPrice} zł | Łącznie biletów: {totalTicketsCount} | Sprzedane: {totalSoldCount}
                    </p>
                    <p className="text-sm text-gray-600">
                      {event.city ? `${event.venue || event.location}, ${event.city}` : event.venue || event.location || "Brak lokalizacji"}
                    </p>
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
