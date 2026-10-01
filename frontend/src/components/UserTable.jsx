export function UserTable({ users, onDelete }) {
  if (users.length === 0) {
    return <p>No users yet.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Created At</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{new Date(user.createdAt).toLocaleString()}</td>
            <td>
              <button onClick={() => onDelete(user.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
