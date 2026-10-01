import { useCallback, useEffect, useState } from "react";

import * as userService from "../services/user.service.js";

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await userService.getUsers();
      setUsers(result.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function addUser(data) {
    const result = await userService.createUser(data);
    setUsers((prev) => [result.data, ...prev]);
  }

  async function removeUser(id) {
    await userService.deleteUser(id);
    setUsers((prev) => prev.filter((user) => user.id !== id));
  }

  return { users, loading, error, addUser, removeUser, reload: loadUsers };
}
