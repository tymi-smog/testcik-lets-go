import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type User = {
  userId: number;
  username: string;
  email: string;
  pending_email?: string | null;
  is_admin?: boolean;
};

export function Profile() {
  const { token, login } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const navigate = useNavigate();

  async function refreshUser(storedToken: string) {
    const response = await fetch("/api/me", {
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Nie udalo sie odswiezyc danych uzytkownika");
    }

    const data = await response.json();
    if (data?.user) {
      setUser(data.user);
      setUsername(data.user.username ?? "");
      setEmail(data.user.email ?? "");
      login(storedToken, data.user);
    }
  }

  useEffect(() => {
    const storedToken = token ?? localStorage.getItem("token");
    if (!storedToken) {
      setUser(null);
      setUsername("");
      setEmail("");
      return;
    }

    refreshUser(storedToken).catch(() => {
      console.error("Nie udalo sie pobrac danych profilu");
    });
  }, [token]);

  async function updateUsername() {
    const storedToken = token ?? localStorage.getItem("token");
    if (!storedToken) return;

    setLoadingUsername(true);

    try {
      const response = await fetch("/api/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ username, email: user?.email }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error ?? "Nie udalo sie zapisac nazwy uzytkownika.");
        return;
      }

      await refreshUser(storedToken);
      alert(data?.message ?? "Nazwa uzytkownika zaktualizowana.");
    } catch {
      alert("Wystapil blad podczas aktualizacji nazwy uzytkownika.");
    } finally {
      setLoadingUsername(false);
    }
  }

  async function updateEmail() {
    const storedToken = token ?? localStorage.getItem("token");
    if (!storedToken) return;

    setLoadingEmail(true);

    try {
      const response = await fetch("/api/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ username: user?.username, email }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error ?? "Nie udalo sie zaktualizowac emaila.");
        return;
      }

      await refreshUser(storedToken);
      alert(data?.message ?? "Wyslalismy email potwierdzajacy zmiane.");
    } catch {
      alert("Wystapil blad podczas aktualizacji emaila.");
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-10">
      <h1 className="text-2xl font-semibold">Szczegoly konta</h1>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Nazwa uzytkownika</h2>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded-md p-2"
        />

        <button
          onClick={updateUsername}
          disabled={loadingUsername}
          className="
            px-4 py-2
            bg-black text-white
            rounded-md
            hover:bg-gray-800
            transition-all duration-200
            disabled:opacity-50
          "
        >
          {loadingUsername ? "Zapisywanie..." : "Zapisz nazwe"}
        </button>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Adres email</h2>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-md p-2"
        />

        {user?.pending_email && (
          <p className="text-sm text-yellow-600">
            Oczekuje na potwierdzenie: {user.pending_email}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          Po zmianie wyslemy email z potwierdzeniem.
        </p>

        <button
          onClick={updateEmail}
          disabled={loadingEmail}
          className="
            px-4 py-2
            bg-black text-white
            rounded-md
            hover:bg-gray-800
            transition-all duration-200
            disabled:opacity-50
          "
        >
          {loadingEmail ? "Wysylanie..." : "Zmien email"}
        </button>
      </div>

      <div className="border rounded-lg p-6">
        <button
          onClick={() => navigate("/forgot-password")}
          className="
            px-4 py-2
            border rounded-md
            hover:bg-gray-100
            transition-all duration-200
          "
        >
          Zmien haslo
        </button>
      </div>
    </div>
  );
}
