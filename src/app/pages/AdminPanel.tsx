import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CalendarRange,
  DollarSign,
  Edit3,
  Flag,
  Search,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

type AdminEvent = {
  id: string | number;
  title: string;
  category?: string | null;
  date: string;
  created_at?: string | null;
  creator_username?: string | null;
  city?: string | null;
  venue?: string | null;
  ticket_price?: number | string | null;
  available_tickets?: number | string | null;
  sold_tickets?: number | string | null;
};

type EventReport = {
  id: number;
  userId: number;
  eventId: number;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reporterUsername: string;
  event: {
    title: string;
    date: string;
    location: string;
    city: string;
    venue: string;
    createdAt: string;
  } | null;
};

type CommissionAnalyticsItem = {
  id: number;
  userId: number;
  eventId: number;
  eventTitle: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  commission: number;
  purchasedAt: string;
  username: string;
  category: string;
  eventDate: string;
};

type CommissionAnalyticsSummary = {
  subtotal: number;
  commission: number;
  total: number;
  purchasesCount: number;
};

type CommissionAnalyticsBucket = {
  subtotal: number;
  commission: number;
  total: number;
  purchasesCount: number;
};

type CommissionAnalyticsResponse = {
  summary: CommissionAnalyticsSummary;
  byUser: Array<CommissionAnalyticsBucket & { username: string }>;
  byCategory: Array<CommissionAnalyticsBucket & { category: string }>;
  items: CommissionAnalyticsItem[];
  filters: {
    user: string | null;
    category: string | null;
    from: string | null;
    to: string | null;
  };
};

type UserOpinion = {
  id: number;
  eventId: number;
  eventTitle: string;
  category: string;
  rating: number;
  reviewText: string;
  createdAt: string;
};

type UserReviewsUser = {
  userId: number;
  username: string;
  isBanned: boolean;
  banUntil: string | null;
  banReason: string | null;
  bannedAt: string | null;
  averageRating: number;
  ratingsCount: number;
  reviewsCount: number;
  firstRatedAt: string | null;
  lastRatedAt: string | null;
  opinions: UserOpinion[];
};

type UserReviewsResponse = {
  summary: {
    usersCount: number;
    ratingsCount: number;
    reviewsCount: number;
    averageRating: number;
  };
  users: UserReviewsUser[];
  filters: {
    search: string | null;
    from: string | null;
    to: string | null;
    minAverage: number | null;
    maxAverage: number | null;
  };
};

type AdminUser = {
  userId: number;
  username: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  banUntil: string | null;
  banReason: string | null;
  bannedAt: string | null;
  ratingsCount: number;
  reviewsCount: number;
  averageRating: number;
  firstRatedAt: string | null;
  lastRatedAt: string | null;
};

type AdminUsersResponse = {
  summary: {
    usersCount: number;
    bannedCount: number;
    adminCount: number;
    verifiedCount: number;
  };
  users: AdminUser[];
  filters: {
    search: string | null;
  };
};

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  scam: "Oszustwo",
  inappropriate: "Nieodpowiednie",
  duplicate: "Duplikat",
  other: "Inne",
};

function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Brak daty"
    : parsed.toLocaleString("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatLocation(city?: string | null, venue?: string | null) {
  if (city && venue) return `${venue}, ${city}`;
  return venue || city || "Brak lokalizacji";
}

function formatMoney(amount: number) {
  return `${amount.toFixed(2)} zĹ‚`;
}

function renderStars(rating: number) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return "â…â…â…â…â…".slice(0, value) + "â†â†â†â†â†".slice(0, 5 - value);
}

export function AdminPanel() {
  const { user, token, isLoading } = useAuth();
  const [reports, setReports] = useState<EventReport[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [analytics, setAnalytics] = useState<CommissionAnalyticsResponse | null>(null);
  const [userReviews, setUserReviews] = useState<UserReviewsResponse | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUsersResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [userReviewsLoading, setUserReviewsLoading] = useState(true);
  const [adminUsersLoading, setAdminUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [userReviewsError, setUserReviewsError] = useState<string | null>(null);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState<null | "delete" | "move">(null);
  const [eventSearch, setEventSearch] = useState("");
  const [eventSortBy, setEventSortBy] = useState<
    "date" | "title" | "category" | "creator" | "location" | "price" | "available" | "sold" | "createdAt"
  >("date");
  const [eventSortDirection, setEventSortDirection] = useState<"asc" | "desc">("asc");
  const [commissionFilters, setCommissionFilters] = useState({
    user: "",
    category: "",
    from: "",
    to: "",
  });
  const [userReviewsFilters, setUserReviewsFilters] = useState({
    search: "",
    from: "",
    to: "",
    minAverage: "",
    maxAverage: "",
  });
  const [adminUsersFilters, setAdminUsersFilters] = useState({
    search: "",
  });
  const [banDrafts, setBanDrafts] = useState<Record<number, { until: string; reason: string }>>({});

  const isAdmin = user?.is_admin === true;
  const categories = useMemo(() => {
    const unique = [...new Set(events.map((event) => event.category || "Inne"))].sort((a, b) =>
      a.localeCompare(b, "pl")
    );
    return unique.length > 0 ? unique : ["Inne"];
  }, [events]);

  const openReports = useMemo(() => reports.filter((report) => report.status === "open"), [reports]);

  function normalizeSearchValue(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pl");
  }

  const filteredSortedEvents = useMemo(() => {
    const query = normalizeSearchValue(eventSearch.trim());

    const filtered = events.filter((event) => {
      if (!query) return true;

      const searchable = [
        event.title,
        event.category || "Inne",
        event.creator_username || "Nieznany",
        event.city || "",
        event.venue || "",
        formatLocation(event.city, event.venue),
        event.date || "",
        event.created_at || "",
        String(event.ticket_price ?? ""),
        String(event.available_tickets ?? ""),
        String(event.sold_tickets ?? ""),
      ]
        .join(" ")
        .toLocaleLowerCase("pl");

      return normalizeSearchValue(searchable).includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      const direction = eventSortDirection === "asc" ? 1 : -1;

      const aValue = (() => {
        switch (eventSortBy) {
          case "title":
            return a.title || "";
          case "category":
            return a.category || "Inne";
          case "creator":
            return a.creator_username || "";
          case "location":
            return formatLocation(a.city, a.venue);
          case "price":
            return Number(a.ticket_price ?? 0);
          case "available":
            return Number(a.available_tickets ?? 0);
          case "sold":
            return Number(a.sold_tickets ?? 0);
          case "createdAt":
            return a.created_at ? Date.parse(a.created_at) : 0;
          case "date":
          default:
            return Date.parse(a.date);
        }
      })();

      const bValue = (() => {
        switch (eventSortBy) {
          case "title":
            return b.title || "";
          case "category":
            return b.category || "Inne";
          case "creator":
            return b.creator_username || "";
          case "location":
            return formatLocation(b.city, b.venue);
          case "price":
            return Number(b.ticket_price ?? 0);
          case "available":
            return Number(b.available_tickets ?? 0);
          case "sold":
            return Number(b.sold_tickets ?? 0);
          case "createdAt":
            return b.created_at ? Date.parse(b.created_at) : 0;
          case "date":
          default:
            return Date.parse(b.date);
        }
      })();

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue), "pl") * direction;
    });

    return sorted;
  }, [events, eventSearch, eventSortBy, eventSortDirection]);

  const visibleSelectedEventIds = useMemo(
    () => new Set(filteredSortedEvents.filter((event) => selectedEventIds.has(Number(event.id))).map((event) => Number(event.id))),
    [filteredSortedEvents, selectedEventIds]
  );

  const visibleSelectedEvents = useMemo(
    () => filteredSortedEvents.filter((event) => visibleSelectedEventIds.has(Number(event.id))),
    [filteredSortedEvents, visibleSelectedEventIds]
  );

  async function loadAnalytics(filters = commissionFilters) {
    if (!token || !isAdmin) {
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }

    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      const params = new URLSearchParams({ analytics: "1" });
      if (filters.user.trim()) params.set("user", filters.user.trim());
      if (filters.category.trim()) params.set("category", filters.category.trim());
      if (filters.from.trim()) params.set("from", filters.from.trim());
      if (filters.to.trim()) params.set("to", filters.to.trim());

      const response = await fetch(`/api/events?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ pobraÄ‡ danych o prowizjach.");
      }

      setAnalytics(data as CommissionAnalyticsResponse);
    } catch (err) {
      setAnalytics(null);
      setAnalyticsError(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function loadUserReviews(filters = userReviewsFilters) {
    if (!token || !isAdmin) {
      setUserReviews(null);
      setUserReviewsLoading(false);
      return;
    }

    try {
      setUserReviewsLoading(true);
      setUserReviewsError(null);

      const params = new URLSearchParams({ userReviews: "1" });
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.from.trim()) params.set("from", filters.from.trim());
      if (filters.to.trim()) params.set("to", filters.to.trim());
      if (filters.minAverage.trim()) params.set("minAverage", filters.minAverage.trim());
      if (filters.maxAverage.trim()) params.set("maxAverage", filters.maxAverage.trim());

      const response = await fetch(`/api/events?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ pobraÄ‡ opinii uĹĽytkownikĂłw.");
      }

      setUserReviews(data as UserReviewsResponse);
    } catch (err) {
      setUserReviews(null);
      setUserReviewsError(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    } finally {
      setUserReviewsLoading(false);
    }
  }

  async function loadAdminUsers(filters = adminUsersFilters) {
    if (!token || !isAdmin) {
      setAdminUsers(null);
      setAdminUsersLoading(false);
      return;
    }

    try {
      setAdminUsersLoading(true);
      setAdminUsersError(null);

      const params = new URLSearchParams({ adminUsers: "1" });
      if (filters.search.trim()) params.set("search", filters.search.trim());

      const response = await fetch(`/api/events?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ pobraÄ‡ listy uĹĽytkownikĂłw.");
      }

      setAdminUsers(data as AdminUsersResponse);
    } catch (err) {
      setAdminUsers(null);
      setAdminUsersError(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    } finally {
      setAdminUsersLoading(false);
    }
  }

  async function handleBanUser(userId: number, until: string, reason: string) {
    if (!token) return;

    if (!until || !reason.trim()) {
      toast.error("Podaj datÄ™ koĹ„ca bana i opis.");
      return;
    }

    try {
      const response = await fetch("/api/events?action=ban-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, banUntil: until, banReason: reason.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ zablokowaÄ‡ uĹĽytkownika.");
      }

      toast.success("UĹĽytkownik zostaĹ‚ zablokowany.");
      void loadAdminUsers();
      void loadUserReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    }
  }

  async function handleUnbanUser(userId: number) {
    if (!token) return;

    try {
      const response = await fetch("/api/events?action=unban-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ odblokowaÄ‡ uĹĽytkownika.");
      }

      toast.success("UĹĽytkownik zostaĹ‚ odblokowany.");
      void loadAdminUsers();
      void loadUserReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!token || !isAdmin) {
        setReports([]);
        setEvents([]);
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        setError(null);

        const [reportsResponse, eventsResponse] = await Promise.all([
          fetch("/api/events?reports=1", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/events"),
        ]);

        if (!reportsResponse.ok) {
          const payload = await reportsResponse.json().catch(() => ({}));
          throw new Error(payload?.error || "Nie udaĹ‚o siÄ™ pobraÄ‡ zgĹ‚oszeĹ„.");
        }

        if (!eventsResponse.ok) {
          throw new Error("Nie udaĹ‚o siÄ™ pobraÄ‡ wydarzeĹ„.");
        }

        const reportsData = await reportsResponse.json();
        const eventsData = await eventsResponse.json();

        if (!mounted) return;

        setReports(Array.isArray(reportsData?.items) ? reportsData.items : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
          setReports([]);
          setEvents([]);
        }
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    }

    loadData();
    void loadAnalytics();
    void loadUserReviews();
    void loadAdminUsers();

    return () => {
      mounted = false;
    };
  }, [token, isAdmin]);

  async function handleDeleteEvent(eventId: number) {
    if (!token) return;

    const confirmed = window.confirm(
      "Czy na pewno chcesz usunÄ…Ä‡ to wydarzenie? Spowoduje to teĹĽ usuniÄ™cie zgĹ‚oszeĹ„, ocen i zakupĂłw powiÄ…zanych z tym wydarzeniem."
    );
    if (!confirmed) return;

    try {
      setDeletingEventId(eventId);
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ usunÄ…Ä‡ wydarzenia.");
      }

      toast.success("Wydarzenie zostaĹ‚o usuniÄ™te.");
      setEvents((prev) => prev.filter((event) => Number(event.id) !== eventId));
      setReports((prev) => prev.filter((report) => report.eventId !== eventId));
      setSelectedEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    } finally {
      setDeletingEventId(null);
    }
  }

  async function handleBulkDelete() {
    if (!token || visibleSelectedEvents.length === 0) return;

    const confirmed = window.confirm(
      `Czy na pewno chcesz usunÄ…Ä‡ ${visibleSelectedEvents.length} wydarzeĹ„?`
    );
    if (!confirmed) return;

    try {
      setBulkActionLoading("delete");
      const response = await fetch("/api/events?action=bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [...visibleSelectedEventIds] }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ usunÄ…Ä‡ wydarzeĹ„.");
      }

      toast.success("Wydarzenia zostaĹ‚y usuniÄ™te.");
      setEvents((prev) => prev.filter((event) => !visibleSelectedEventIds.has(Number(event.id))));
      setReports((prev) => prev.filter((report) => !visibleSelectedEventIds.has(report.eventId)));
      setSelectedEventIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    } finally {
      setBulkActionLoading(null);
    }
  }

  async function handleBulkMove() {
    if (!token || visibleSelectedEvents.length === 0) return;

    const category = bulkCategory.trim();
    if (!category) {
      toast.error("Wybierz kategoriÄ™ docelowÄ….");
      return;
    }

    try {
      setBulkActionLoading("move");
      const response = await fetch("/api/events?action=bulk-move-category", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [...visibleSelectedEventIds], category }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udaĹ‚o siÄ™ przenieĹ›Ä‡ wydarzeĹ„.");
      }

      toast.success("Wydarzenia zostaĹ‚y przeniesione do nowej kategorii.");
      setEvents((prev) =>
        prev.map((event) =>
          visibleSelectedEventIds.has(Number(event.id)) ? { ...event, category } : event
        )
      );
      setSelectedEventIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WystÄ…piĹ‚ nieznany bĹ‚Ä…d.");
    } finally {
      setBulkActionLoading(null);
    }
  }

  async function handleAnalyticsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAnalytics(commissionFilters);
  }

  function clearAnalyticsFilters() {
    const nextFilters = {
      user: "",
      category: "",
      from: "",
      to: "",
    };
    setCommissionFilters(nextFilters);
    void loadAnalytics(nextFilters);
  }

  async function handleUserReviewsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadUserReviews(userReviewsFilters);
  }

  function clearUserReviewsFilters() {
    const nextFilters = {
      search: "",
      from: "",
      to: "",
      minAverage: "",
      maxAverage: "",
    };
    setUserReviewsFilters(nextFilters);
    void loadUserReviews(nextFilters);
  }

  async function handleAdminUsersSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAdminUsers(adminUsersFilters);
  }

  function clearAdminUsersFilters() {
    const nextFilters = {
      search: "",
    };
    setAdminUsersFilters(nextFilters);
    void loadAdminUsers(nextFilters);
  }

  function toggleSelected(eventId: number) {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedEventIds(new Set(filteredSortedEvents.map((event) => Number(event.id))));
  }

  function clearSelection() {
    setSelectedEventIds(new Set());
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-gray-500">Ĺadowanie panelu...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-3 text-amber-900">
              <ShieldAlert className="size-5" />
              <h1 className="text-2xl font-semibold">Panel administratora</h1>
            </div>
            <p className="text-amber-800">
              DostÄ™p do tego widoku majÄ… tylko zalogowani administratorzy.
            </p>
            {!user && (
              <Button asChild>
                <Link to="/login">PrzejdĹş do logowania</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-slate-100 p-8 text-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldAlert className="size-8 text-emerald-700" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700/80">Admin panel</p>
            <h1 className="text-4xl font-semibold">Panel administratora</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-slate-600">
          PrzeglÄ…daj zgĹ‚oszenia uĹĽytkownikĂłw, edytuj wydarzenia i wykonuj akcje zbiorcze bez
          opuszczania panelu.
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-500">Otwarte zgĹ‚oszenia</p>
              <p className="text-3xl font-semibold">{openReports.length}</p>
            </div>
            <Flag className="size-10 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-500">Wszystkie zgĹ‚oszenia</p>
              <p className="text-3xl font-semibold">{reports.length}</p>
            </div>
            <AlertTriangle className="size-10 text-rose-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-500">Wydarzenia</p>
              <p className="text-3xl font-semibold">{events.length}</p>
            </div>
            <Calendar className="size-10 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full max-w-5xl grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="reports">Zgłoszenia</TabsTrigger>
          <TabsTrigger value="commission">Dochód</TabsTrigger>
          <TabsTrigger value="users">Użytkownicy</TabsTrigger>
          <TabsTrigger value="opinions">Opinie</TabsTrigger>
          <TabsTrigger value="events">Wydarzenia</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {loadingData && <p className="text-gray-500">Ĺadowanie zgĹ‚oszeĹ„...</p>}

          {!loadingData && reports.length === 0 && (
            <Card>
              <CardContent className="p-6 text-gray-600">Brak zgĹ‚oszeĹ„ do wyĹ›wietlenia.</CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="overflow-hidden border-slate-200">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {report.event?.title || `Wydarzenie #${report.eventId}`}
                        </h2>
                        <Badge variant={report.status === "open" ? "default" : "secondary"}>
                          {report.status === "open" ? "Otwarte" : report.status}
                        </Badge>
                        <Badge variant="outline">{reasonLabels[report.reason] || report.reason}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        ZgĹ‚oszone przez {report.reporterUsername} dnia {formatDate(report.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/my-events?edit=${report.eventId}`}>
                          <Edit3 className="mr-2 size-4" />
                          Edytuj wydarzenie
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={deletingEventId === report.eventId}
                        onClick={() => handleDeleteEvent(report.eventId)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        {deletingEventId === report.eventId ? "Usuwanie..." : "UsuĹ„ wydarzenie"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">SzczegĂłĹ‚y zgĹ‚oszenia</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {report.details || "Brak dodatkowego opisu."}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">Data wydarzenia:</span>{" "}
                        {report.event ? formatDate(report.event.date) : "Brak danych"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Lokalizacja:</span>{" "}
                        {report.event
                          ? formatLocation(report.event.city, report.event.venue)
                          : "Brak danych"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">ZgĹ‚oszenie zaktualizowano:</span>{" "}
                        {formatDate(report.updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="commission" className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">DochĂłd z prowizji</h2>
                  <p className="text-sm text-slate-600">
                    Prowizja 5% liczona jest od aktywnych zakupĂłw biletĂłw, bez zwrĂłconych transakcji.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => void loadAnalytics()}>
                  OdĹ›wieĹĽ dane
                </Button>
              </div>

              <form onSubmit={handleAnalyticsSubmit} className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="commissionUser">
                    UĹĽytkownik
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="commissionUser"
                      value={commissionFilters.user}
                      onChange={(e) =>
                        setCommissionFilters((prev) => ({ ...prev, user: e.target.value }))
                      }
                      placeholder="Szukaj po nazwie uĹĽytkownika"
                      className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="commissionCategory">
                    Kategoria
                  </label>
                  <select
                    id="commissionCategory"
                    value={commissionFilters.category}
                    onChange={(e) =>
                      setCommissionFilters((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Wszystkie</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="commissionFrom">
                    Od
                  </label>
                  <input
                    id="commissionFrom"
                    type="date"
                    value={commissionFilters.from}
                    onChange={(e) =>
                      setCommissionFilters((prev) => ({ ...prev, from: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="commissionTo">
                    Do
                  </label>
                  <input
                    id="commissionTo"
                    type="date"
                    value={commissionFilters.to}
                    onChange={(e) =>
                      setCommissionFilters((prev) => ({ ...prev, to: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-4">
                  <Button type="submit">Filtruj</Button>
                  <Button type="button" variant="outline" onClick={clearAnalyticsFilters}>
                    WyczyĹ›Ä‡ filtry
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {analyticsError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-red-700">{analyticsError}</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Prowizja Ĺ‚Ä…cznie</p>
                  <p className="text-3xl font-semibold">
                    {analytics ? formatMoney(analytics.summary.commission) : analyticsLoading ? "..." : "0.00 zĹ‚"}
                  </p>
                </div>
                <DollarSign className="size-10 text-emerald-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Suma sprzedaĹĽy</p>
                  <p className="text-3xl font-semibold">
                    {analytics ? formatMoney(analytics.summary.subtotal) : analyticsLoading ? "..." : "0.00 zĹ‚"}
                  </p>
                </div>
                <TrendingUp className="size-10 text-blue-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">ĹÄ…cznie z prowizjÄ…</p>
                  <p className="text-3xl font-semibold">
                    {analytics ? formatMoney(analytics.summary.total) : analyticsLoading ? "..." : "0.00 zĹ‚"}
                  </p>
                </div>
                <CalendarRange className="size-10 text-violet-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Transakcje</p>
                  <p className="text-3xl font-semibold">
                    {analytics ? analytics.summary.purchasesCount : analyticsLoading ? "..." : "0"}
                  </p>
                </div>
                <Users className="size-10 text-amber-600" />
              </CardContent>
            </Card>
          </div>

          {analyticsLoading && <p className="text-gray-500">Ĺadowanie danych o prowizji...</p>}

          {!analyticsLoading && analytics && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-slate-200">
                <CardContent className="space-y-4 p-5">
                  <h3 className="text-lg font-semibold">DochĂłd wedĹ‚ug uĹĽytkownikĂłw</h3>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">UĹĽytkownik</th>
                          <th className="px-4 py-3 font-medium">Prowizja</th>
                          <th className="px-4 py-3 font-medium">Zakupy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.byUser.length > 0 ? (
                          analytics.byUser.map((row) => (
                            <tr key={row.username}>
                              <td className="px-4 py-3 font-medium text-slate-900">{row.username}</td>
                              <td className="px-4 py-3">{formatMoney(row.commission)}</td>
                              <td className="px-4 py-3">{row.purchasesCount}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={3}>
                              Brak danych dla wybranych filtrĂłw.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardContent className="space-y-4 p-5">
                  <h3 className="text-lg font-semibold">DochĂłd wedĹ‚ug kategorii</h3>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Kategoria</th>
                          <th className="px-4 py-3 font-medium">Prowizja</th>
                          <th className="px-4 py-3 font-medium">Zakupy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.byCategory.length > 0 ? (
                          analytics.byCategory.map((row) => (
                            <tr key={row.category}>
                              <td className="px-4 py-3 font-medium text-slate-900">{row.category}</td>
                              <td className="px-4 py-3">{formatMoney(row.commission)}</td>
                              <td className="px-4 py-3">{row.purchasesCount}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={3}>
                              Brak danych dla wybranych filtrĂłw.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!analyticsLoading && analytics && (
            <Card className="border-slate-200">
              <CardContent className="space-y-4 p-5">
                <h3 className="text-lg font-semibold">Ostatnie transakcje</h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">UĹĽytkownik</th>
                        <th className="px-4 py-3 font-medium">Wydarzenie</th>
                        <th className="px-4 py-3 font-medium">Kategoria</th>
                        <th className="px-4 py-3 font-medium">Zakup</th>
                        <th className="px-4 py-3 font-medium text-right">Prowizja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.items.length > 0 ? (
                        analytics.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{item.username}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{item.eventTitle}</div>
                              <div className="text-xs text-slate-500">{item.ticketTypeName}</div>
                            </td>
                            <td className="px-4 py-3">{item.category}</td>
                            <td className="px-4 py-3">{formatDate(item.purchasedAt)}</td>
                            <td className="px-4 py-3 text-right">{formatMoney(item.commission)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-4 text-slate-500" colSpan={5}>
                            Brak transakcji dla wybranych filtrĂłw.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Użytkownicy</h2>
                  <p className="text-sm text-slate-600">
                    Wyszukuj wszystkich użytkowników niezależnie od tego, czy wystawili opinię.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => void loadAdminUsers()}>
                  Odśwież dane
                </Button>
              </div>

              <form onSubmit={handleAdminUsersSubmit} className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="adminUsersSearch">
                    Szukaj użytkownika
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="adminUsersSearch"
                      value={adminUsersFilters.search}
                      onChange={(e) =>
                        setAdminUsersFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                      placeholder="Nazwa użytkownika lub e-mail"
                      className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-3">
                  <Button type="submit">Filtruj</Button>
                  <Button type="button" variant="outline" onClick={clearAdminUsersFilters}>
                    Wyczyść filtry
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {adminUsersError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-red-700">{adminUsersError}</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Wszyscy użytkownicy</p>
                  <p className="text-3xl font-semibold">
                    {adminUsers ? adminUsers.summary.usersCount : adminUsersLoading ? "..." : "0"}
                  </p>
                </div>
                <Users className="size-10 text-slate-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Zbanowani</p>
                  <p className="text-3xl font-semibold">
                    {adminUsers ? adminUsers.summary.bannedCount : adminUsersLoading ? "..." : "0"}
                  </p>
                </div>
                <ShieldAlert className="size-10 text-rose-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Administratorzy</p>
                  <p className="text-3xl font-semibold">
                    {adminUsers ? adminUsers.summary.adminCount : adminUsersLoading ? "..." : "0"}
                  </p>
                </div>
                <AlertTriangle className="size-10 text-amber-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Zweryfikowani</p>
                  <p className="text-3xl font-semibold">
                    {adminUsers ? adminUsers.summary.verifiedCount : adminUsersLoading ? "..." : "0"}
                  </p>
                </div>
                <CalendarRange className="size-10 text-emerald-600" />
              </CardContent>
            </Card>
          </div>

          {adminUsersLoading && <p className="text-gray-500">Ładowanie użytkowników...</p>}

          {!adminUsersLoading && adminUsers && (
            <div className="grid gap-4">
              {adminUsers.users.length > 0 ? (
                adminUsers.users.map((entry) => (
                  <Card key={entry.userId} className="border-slate-200">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-slate-900">{entry.username}</h3>
                            {entry.isAdmin && <Badge>Admin</Badge>}
                            {entry.isVerified && <Badge variant="outline">Zweryfikowany</Badge>}
                            {entry.isBanned ? <Badge variant="destructive">Zablokowany</Badge> : <Badge variant="outline">Aktywny</Badge>}
                          </div>
                          <p className="text-sm text-slate-500">{entry.email || "Brak e-maila"}</p>
                          <p className="text-sm text-slate-500">
                            Średnia ocena: {entry.averageRating.toFixed(2)} / 5 | Oceny: {entry.ratingsCount} | Opinie:{" "}
                            {entry.reviewsCount}
                          </p>
                          <p className="text-sm text-slate-500">
                            Aktywność: {entry.firstRatedAt ? formatDate(entry.firstRatedAt) : "Brak danych"} -{" "}
                            {entry.lastRatedAt ? formatDate(entry.lastRatedAt) : "Brak danych"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Banowanie użytkownika</p>
                            <p className="text-xs text-slate-500">
                              {entry.isBanned
                                ? "Konto jest zablokowane."
                                : "Ustaw datę końca bana i krótki opis."}
                            </p>
                          </div>
                          {entry.isBanned ? (
                            <Button type="button" variant="destructive" onClick={() => void handleUnbanUser(entry.userId)}>
                              Odbanuj
                            </Button>
                          ) : (
                            <Badge variant="outline">Aktywny</Badge>
                          )}
                        </div>

                        {entry.isBanned ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="md:col-span-2 space-y-2">
                              <p className="text-sm text-slate-600">
                                Do:{" "}
                                <span className="font-medium text-slate-900">
                                  {entry.banUntil ? formatDate(entry.banUntil) : "Brak daty"}
                                </span>
                              </p>
                              <p className="text-sm text-slate-600">
                                Opis:{" "}
                                <span className="font-medium text-slate-900">
                                  {entry.banReason || "Brak opisu"}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500">
                                Nałożono: {entry.bannedAt ? formatDate(entry.bannedAt) : "Brak danych"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor={`adminBanUntil-${entry.userId}`}>
                                Ban do
                              </label>
                              <input
                                id={`adminBanUntil-${entry.userId}`}
                                type="datetime-local"
                                value={banDrafts[entry.userId]?.until ?? ""}
                                onChange={(e) =>
                                  setBanDrafts((prev) => ({
                                    ...prev,
                                    [entry.userId]: {
                                      until: e.target.value,
                                      reason: prev[entry.userId]?.reason ?? "",
                                    },
                                  }))
                                }
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor={`adminBanReason-${entry.userId}`}>
                                Opis bana
                              </label>
                              <textarea
                                id={`adminBanReason-${entry.userId}`}
                                value={banDrafts[entry.userId]?.reason ?? ""}
                                onChange={(e) =>
                                  setBanDrafts((prev) => ({
                                    ...prev,
                                    [entry.userId]: {
                                      until: prev[entry.userId]?.until ?? "",
                                      reason: e.target.value,
                                    },
                                  }))
                                }
                                rows={3}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                placeholder="Krótko opisz powód blokady"
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                  void handleBanUser(
                                    entry.userId,
                                    banDrafts[entry.userId]?.until ?? "",
                                    banDrafts[entry.userId]?.reason ?? ""
                                  )
                                }
                              >
                                Zbanuj użytkownika
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-gray-600">Brak użytkowników dla wybranych filtrów.</CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opinions" className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Opinie użytkowników</h2>
                  <p className="text-sm text-slate-600">
                    Lista użytkowników, którzy wystawili oceny, z ich średnią i zapisanymi opiniami.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => void loadUserReviews()}>
                  OdĹ›wieĹĽ dane
                </Button>
              </div>

              <form onSubmit={handleUserReviewsSubmit} className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="userReviewsSearch">
                    Szukaj uĹĽytkownika
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="userReviewsSearch"
                      value={userReviewsFilters.search}
                      onChange={(e) =>
                        setUserReviewsFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                      placeholder="Wpisz nazwÄ™ uĹĽytkownika"
                      className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="userReviewsMin">
                    Ĺšrednia od
                  </label>
                  <input
                    id="userReviewsMin"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={userReviewsFilters.minAverage}
                    onChange={(e) =>
                      setUserReviewsFilters((prev) => ({ ...prev, minAverage: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="userReviewsMax">
                    Ĺšrednia do
                  </label>
                  <input
                    id="userReviewsMax"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={userReviewsFilters.maxAverage}
                    onChange={(e) =>
                      setUserReviewsFilters((prev) => ({ ...prev, maxAverage: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="userReviewsFrom">
                    Od
                  </label>
                  <input
                    id="userReviewsFrom"
                    type="date"
                    value={userReviewsFilters.from}
                    onChange={(e) =>
                      setUserReviewsFilters((prev) => ({ ...prev, from: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="userReviewsTo">
                    Do
                  </label>
                  <input
                    id="userReviewsTo"
                    type="date"
                    value={userReviewsFilters.to}
                    onChange={(e) =>
                      setUserReviewsFilters((prev) => ({ ...prev, to: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-4">
                  <Button type="submit">Filtruj</Button>
                  <Button type="button" variant="outline" onClick={clearUserReviewsFilters}>
                    WyczyĹ›Ä‡ filtry
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {userReviewsError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-red-700">{userReviewsError}</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Ĺšrednia ocena</p>
                  <p className="text-3xl font-semibold">
                    {userReviews ? `${userReviews.summary.averageRating.toFixed(2)} / 5` : userReviewsLoading ? "..." : "0.00 / 5"}
                  </p>
                </div>
                <Users className="size-10 text-indigo-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">UĹĽytkownicy</p>
                  <p className="text-3xl font-semibold">
                    {userReviews ? userReviews.summary.usersCount : userReviewsLoading ? "..." : "0"}
                  </p>
                </div>
                <Users className="size-10 text-emerald-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Oceny</p>
                  <p className="text-3xl font-semibold">
                    {userReviews ? userReviews.summary.ratingsCount : userReviewsLoading ? "..." : "0"}
                  </p>
                </div>
                <CalendarRange className="size-10 text-blue-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">Opinie tekstowe</p>
                  <p className="text-3xl font-semibold">
                    {userReviews ? userReviews.summary.reviewsCount : userReviewsLoading ? "..." : "0"}
                  </p>
                </div>
                <Flag className="size-10 text-amber-600" />
              </CardContent>
            </Card>
          </div>

          {userReviewsLoading && <p className="text-gray-500">Ĺadowanie opinii uĹĽytkownikĂłw...</p>}

          {!userReviewsLoading && userReviews && (
            <div className="grid gap-4">
              {userReviews.users.length > 0 ? (
                userReviews.users.map((entry) => (
                  <Card key={entry.userId} className="border-slate-200">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-slate-900">{entry.username}</h3>
                            <Badge variant="outline">{renderStars(entry.averageRating)}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">
                            Ĺšrednia: {entry.averageRating.toFixed(2)} / 5 | Oceny: {entry.ratingsCount} | Opinie:{" "}
                            {entry.reviewsCount}
                          </p>
                          <p className="text-sm text-slate-500">
                            Zakres aktywnoĹ›ci:{" "}
                            {entry.firstRatedAt ? formatDate(entry.firstRatedAt) : "Brak danych"} -{" "}
                            {entry.lastRatedAt ? formatDate(entry.lastRatedAt) : "Brak danych"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {entry.opinions.length > 0 ? (
                          entry.opinions.map((opinion) => (
                            <div
                              key={opinion.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium text-slate-900">{opinion.eventTitle}</p>
                                  <p className="text-xs text-slate-500">{opinion.category}</p>
                                </div>
                                <Badge variant="secondary">{opinion.rating} / 5</Badge>
                              </div>
                              <p className="text-sm text-slate-700">
                                {opinion.reviewText || "Brak pisemnej opinii."}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">{formatDate(opinion.createdAt)}</p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                            Brak opinii tekstowych dla wybranego zakresu.
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Banowanie uĹĽytkownika</p>
                            <p className="text-xs text-slate-500">
                              {entry.isBanned
                                ? "Konto jest zablokowane."
                                : "Ustaw datÄ™ koĹ„ca bana i krĂłtki opis."}
                            </p>
                          </div>
                          {entry.isBanned ? (
                            <Badge variant="destructive">Zablokowany</Badge>
                          ) : (
                            <Badge variant="outline">Aktywny</Badge>
                          )}
                        </div>

                        {entry.isBanned ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="md:col-span-2 space-y-2">
                              <p className="text-sm text-slate-600">
                                Do:{" "}
                                <span className="font-medium text-slate-900">
                                  {entry.banUntil ? formatDate(entry.banUntil) : "Brak daty"}
                                </span>
                              </p>
                              <p className="text-sm text-slate-600">
                                Opis:{" "}
                                <span className="font-medium text-slate-900">
                                  {entry.banReason || "Brak opisu"}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500">
                                NaĹ‚oĹĽono: {entry.bannedAt ? formatDate(entry.bannedAt) : "Brak danych"}
                              </p>
                            </div>
                            <div className="flex items-end">
                              <Button type="button" variant="destructive" onClick={() => void handleUnbanUser(entry.userId)}>
                                Odbanuj
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor={`banUntil-${entry.userId}`}>
                                Ban do
                              </label>
                              <input
                                id={`banUntil-${entry.userId}`}
                                type="datetime-local"
                                value={banDrafts[entry.userId]?.until ?? ""}
                                onChange={(e) =>
                                  setBanDrafts((prev) => ({
                                    ...prev,
                                    [entry.userId]: {
                                      until: e.target.value,
                                      reason: prev[entry.userId]?.reason ?? "",
                                    },
                                  }))
                                }
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor={`banReason-${entry.userId}`}>
                                Opis bana
                              </label>
                              <textarea
                                id={`banReason-${entry.userId}`}
                                value={banDrafts[entry.userId]?.reason ?? ""}
                                onChange={(e) =>
                                  setBanDrafts((prev) => ({
                                    ...prev,
                                    [entry.userId]: {
                                      until: prev[entry.userId]?.until ?? "",
                                      reason: e.target.value,
                                    },
                                  }))
                                }
                                rows={3}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                placeholder="KrĂłtko opisz powĂłd blokady"
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                  void handleBanUser(
                                    entry.userId,
                                    banDrafts[entry.userId]?.until ?? "",
                                    banDrafts[entry.userId]?.reason ?? ""
                                  )
                                }
                              >
                                Zbanuj uĹĽytkownika
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-gray-600">Brak uĹĽytkownikĂłw dla wybranych filtrĂłw.</CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Wyszukiwanie i sortowanie</h2>
                  <p className="text-sm text-slate-600">
                    Szukaj po tytule, kategorii, autorze, lokalizacji, dacie i liczbach biletĂłw.
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  Widoczne wydarzenia: <span className="font-semibold">{filteredSortedEvents.length}</span>
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2 xl:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="eventSearch">
                    Szukaj wydarzeĹ„
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="eventSearch"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="TytuĹ‚, kategoria, lokalizacja, autor, data, ceny..."
                      className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="eventSortBy">
                    Sortuj wedĹ‚ug
                  </label>
                  <select
                    id="eventSortBy"
                    value={eventSortBy}
                    onChange={(e) => setEventSortBy(e.target.value as typeof eventSortBy)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="date">Daty wydarzenia</option>
                    <option value="title">TytuĹ‚u</option>
                    <option value="category">Kategorii</option>
                    <option value="creator">Autora</option>
                    <option value="location">Lokalizacji</option>
                    <option value="price">Ceny biletu</option>
                    <option value="available">DostÄ™pnych biletĂłw</option>
                    <option value="sold">Sprzedanych biletĂłw</option>
                    <option value="createdAt">Daty utworzenia</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="eventSortDirection">
                    Kierunek
                  </label>
                  <select
                    id="eventSortDirection"
                    value={eventSortDirection}
                    onChange={(e) => setEventSortDirection(e.target.value as "asc" | "desc")}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="asc">RosnÄ…co</option>
                    <option value="desc">MalejÄ…co</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setEventSearch("")}>
                  WyczyĹ›Ä‡ wyszukiwanie
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEventSortBy("date");
                    setEventSortDirection("asc");
                  }}
                >
                  Resetuj sortowanie
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Akcje zbiorcze</h2>
                  <p className="text-sm text-slate-600">
                    Zaznacz wydarzenia i wykonaj operacjÄ™ na wielu pozycjach jednoczeĹ›nie.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={selectAllVisible}
                    disabled={filteredSortedEvents.length === 0}
                  >
                    Zaznacz wszystko
                  </Button>
                  <Button type="button" variant="outline" onClick={clearSelection} disabled={selectedEventIds.size === 0}>
                    WyczyĹ›Ä‡ zaznaczenie
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-64 flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="bulkCategory">
                    PrzenieĹ› do kategorii
                  </label>
                  <select
                    id="bulkCategory"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Wybierz kategoriÄ™</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  onClick={handleBulkMove}
                  disabled={visibleSelectedEvents.length === 0 || bulkActionLoading === "move"}
                >
                  {bulkActionLoading === "move" ? "Przenoszenie..." : "PrzenieĹ› zaznaczone"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={visibleSelectedEvents.length === 0 || bulkActionLoading === "delete"}
                >
                  {bulkActionLoading === "delete" ? "Usuwanie..." : "UsuĹ„ zaznaczone"}
                </Button>
              </div>

              <p className="text-sm text-slate-600">
                Zaznaczono: <span className="font-semibold">{visibleSelectedEvents.length}</span>
              </p>
            </CardContent>
          </Card>

          {loadingData && <p className="text-gray-500">Ĺadowanie wydarzeĹ„...</p>}

          {!loadingData && filteredSortedEvents.length === 0 && (
            <Card>
              <CardContent className="p-6 text-gray-600">Brak wydarzeĹ„ do wyĹ›wietlenia.</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSortedEvents.map((event) => {
              const eventId = Number(event.id);
              const isSelected = selectedEventIds.has(eventId);

              return (
                <Card key={event.id} className={`border-slate-200 ${isSelected ? "ring-2 ring-emerald-500" : ""}`}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(eventId)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge>{event.category || "Inne"}</Badge>
                          </div>
                          <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
                        </div>
                      </label>
                    </div>

                    <p className="text-sm text-slate-500">
                      {event.creator_username || "Nieznany"} | {formatDate(event.date)}
                    </p>
                    <p className="text-sm text-slate-600">{formatLocation(event.city, event.venue)}</p>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/my-events?edit=${event.id}`}>
                          <Edit3 className="mr-2 size-4" />
                          Edytuj
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={deletingEventId === eventId}
                        onClick={() => handleDeleteEvent(eventId)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        {deletingEventId === eventId ? "Usuwanie..." : "UsuĹ„"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
