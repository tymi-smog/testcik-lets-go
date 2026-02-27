import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: params.get("token"),
        password,
      }),
    });

    if (!res.ok) {
      alert("Błąd resetu hasła");
      return;
    }

    alert("Hasło zostało zmienione");
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">
          Ustaw nowe hasło
        </h1>

        <input
          type="password"
          placeholder="Nowe hasło"
          className="w-full border rounded-lg p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="w-full bg-black text-white rounded-lg p-2">
          Zapisz nowe hasło
        </button>
      </form>
    </div>
  );
}
