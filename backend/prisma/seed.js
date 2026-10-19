import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// docs/api/auth.md: one Admin, a Factory Worker and a Sale Worker. Demo passwords: change them.
const users = [
  { name: "Admin", email: "admin@gmail.com", password: "admin", role: "Admin", department: "Administration" },
  { name: "Factory Worker", email: "worker@gmail.com", password: "worker", role: "Worker", department: "Factory" },
  { name: "Sale Worker", email: "sale@gmail.com", password: "sale", role: "Worker", department: "Sales" }
];

for (const u of users) {
  const { password, ...rest } = u;
  await prisma.user.upsert({
    where: { email: u.email },
    update: {},
    create: { ...rest, passwordHash: await bcrypt.hash(password, 10) }
  });
}

console.log(`Seeded ${users.length} users`);
await prisma.$disconnect();
