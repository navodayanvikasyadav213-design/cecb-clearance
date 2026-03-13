import { AppStatus, PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

type SeedUser = {
	email: string;
	name: string;
	role: Role;
	password: string;
};

const users: SeedUser[] = [
	{
		email: "admin@example.com",
		name: "Admin User",
		role: "ADMIN",
		password: "Admin@123",
	},
	{
		email: "proponent@example.com",
		name: "Proponent User",
		role: "PROPONENT",
		password: "Proponent@123",
	},
	{
		email: "scrutiny@example.com",
		name: "Scrutiny Officer",
		role: "SCRUTINY",
		password: "Scrutiny@123",
	},
	{
		email: "mom@example.com",
		name: "MOM Team User",
		role: "MOM_TEAM",
		password: "MomTeam@123",
	},
];

async function upsertUser(input: SeedUser) {
	const passwordHash = await argon2.hash(input.password);

	return prisma.user.upsert({
		where: { email: input.email },
		update: {
			name: input.name,
			role: input.role,
			passwordHash,
		},
		create: {
			email: input.email,
			name: input.name,
			role: input.role,
			passwordHash,
		},
	});
}

async function upsertSampleApplications(proponentId: string) {
	const samples: Array<{ projectName: string; sector: string; district: string; status: AppStatus }> = [
		{
			projectName: "Solar Plant - Raipur",
			sector: "Energy",
			district: "Raipur",
			status: "DRAFT",
		},
		{
			projectName: "Industrial Park - Durg",
			sector: "Infrastructure",
			district: "Durg",
			status: "SUBMITTED",
		},
		{
			projectName: "Food Processing Unit - Bilaspur",
			sector: "Manufacturing",
			district: "Bilaspur",
			status: "UNDER_SCRUTINY",
		},
	];

	for (const sample of samples) {
		const existing = await prisma.application.findFirst({
			where: {
				proponentId,
				projectName: sample.projectName,
			},
			select: { id: true },
		});

		if (existing) {
			await prisma.application.update({
				where: { id: existing.id },
				data: {
					sector: sample.sector,
					district: sample.district,
					status: sample.status,
				},
			});
			continue;
		}

		await prisma.application.create({
			data: {
				proponentId,
				projectName: sample.projectName,
				sector: sample.sector,
				district: sample.district,
				state: "Chhattisgarh",
				status: sample.status,
			},
		});
	}
}

async function main() {
	const seededUsers = await Promise.all(users.map(upsertUser));
	const proponent = seededUsers.find((user) => user.role === "PROPONENT");

	if (!proponent) {
		throw new Error("Proponent user not created");
	}

	await upsertSampleApplications(proponent.id);

	console.log("Seed complete: 4 users + 3 sample applications");
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
