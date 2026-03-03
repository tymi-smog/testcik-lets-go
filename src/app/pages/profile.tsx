import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type User = {
  user_id: number;
  username: string;
  email: string;
  pending_email?: string | null;
  is_admin?: boolean;
};

export function Profile() {
  const [user, setUser] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser(payload);
      setUsername(payload.username);
      setEmail(payload.email);
    } catch {
      console.error("JWT decode error");
    }
  }, []);

  async function updateUsername() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingUsername(true);

    await fetch("/api/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, email: user?.email }),
    });

    setLoadingUsername(false);
    alert("Nazwa użytkownika zaktualizowana ✅");
  }

  async function updateEmail() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingEmail(true);

    await fetch("/api/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: user?.username, email }),
    });

    setLoadingEmail(false);
    alert("Wysłaliśmy email potwierdzający zmianę 📩");
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-10">
      <h1 className="text-2xl font-semibold">Szczegóły konta</h1>

      {/* 🔹 Zmiana nazwy użytkownika */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Nazwa użytkownika</h2>

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
          {loadingUsername ? "Zapisywanie..." : "Zapisz nazwę"}
        </button>
      </div>

      {/* 🔹 Zmiana email */}
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
          Po zmianie wyślemy email z potwierdzeniem.
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
          {loadingEmail ? "Wysyłanie..." : "Zmień email"}
        </button>
      </div>

      {/* 🔹 Zmiana hasła */}
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
          Zmień hasło
        </button>
      </div>
    </div>
  );
}
