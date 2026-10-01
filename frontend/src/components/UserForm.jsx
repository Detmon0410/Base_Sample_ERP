import { useState } from "react";

export function UserForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({ name, email });
      setName("");
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Add User"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
