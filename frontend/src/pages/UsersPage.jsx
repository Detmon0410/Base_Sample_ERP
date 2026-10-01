import { UserForm } from "../components/UserForm.jsx";
import { UserTable } from "../components/UserTable.jsx";
import { useUsers } from "../hooks/useUsers.js";

export function UsersPage() {
  const { users, loading, error, addUser, removeUser } = useUsers();

  if (loading) {
    return <p>Loading users...</p>;
  }

  return (
    <div>
      <h1>Users</h1>
      <UserForm onSubmit={addUser} />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <UserTable users={users} onDelete={removeUser} />
    </div>
  );
}
