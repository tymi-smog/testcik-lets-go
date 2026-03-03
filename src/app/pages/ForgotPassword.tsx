import { useState } from "react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();

    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    alert("Jeśli konto istnieje — wysłaliśmy email 🙂");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto py-10">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full border rounded-lg p-2"
      />
<button
  className="
    mt-3 w-full
    bg-black text-white
    rounded-lg p-2
    hover:bg-gray-800
    active:scale-95
    transition-all duration-200
  "
>
  Resetuj hasło
</button>
    </form>
  );
}
