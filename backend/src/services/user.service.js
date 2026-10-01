import { prisma } from "../lib/prisma.js";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: {
      id: "desc"
    }
  });
}

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: {
      id
    }
  });
}

export async function createUser(data) {
  return prisma.user.create({
    data
  });
}

export async function updateUser(id, data) {
  return prisma.user.update({
    where: {
      id
    },
    data
  });
}

export async function deleteUser(id) {
  return prisma.user.delete({
    where: {
      id
    }
  });
}
