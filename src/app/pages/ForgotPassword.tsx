export function ForgotPassword() {
  const [email, setEmail] = useState("");

  async function handleSubmit(e:any) {
    e.preventDefault();

    await fetch("/api/forgot-password", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email })
    });

    alert("Jeśli konto istnieje — wysłaliśmy email 🙂");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto py-10">
      <input
        value={email}
        onChange={e=>setEmail(e.target.value)}
        placeholder="Email"
      />
      <button>Resetuj hasło</button>
    </form>
  );
}
