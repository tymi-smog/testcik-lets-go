import { useState } from "react";
import { Link } from "react-router-dom";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Błąd logowania");
        setLoading(false);
        return;
      }

      // zapis tokena
      localStorage.setItem("token", data.token);

      // redirect na home
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Coś poszło nie tak");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">Logowanie</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Hasło"
          className="w-full border rounded-lg p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-lg p-2 hover:bg-gray-800 transition"
        >
          {loading ? "Logowanie..." : "Zaloguj się"}
        </button>

        <div className="flex justify-between text-sm mt-3 text-gray-500">
  <Link to="/forgot-password" className="hover:underline">
    Zapomniałeś hasła?
  </Link>
        

<p className="text-sm text-center text-gray-500">
  Nie masz konta?{" "}
  <a href="/register" className="underline">
    Zarejestruj się
  </a>
</p>
      </form>
    </div>
  );
}

