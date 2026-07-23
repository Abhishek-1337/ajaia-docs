import prisma from "./db";

const SEED_USERS = [
  { name: "Alice", email: "alice@example.com", avatarColor: "#4A90D9" },
  { name: "Bob", email: "bob@example.com", avatarColor: "#50B86C" },
  { name: "Carol", email: "carol@example.com", avatarColor: "#E8744A" },
];

async function seed() {
  console.log("Seeding database...");

  const users = await Promise.all(
    SEED_USERS.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, avatarColor: u.avatarColor },
        create: u,
      })
    )
  );

  const alice = users.find((u) => u.email === "alice@example.com")!;
  const bob = users.find((u) => u.email === "bob@example.com")!;

  const sampleDocs = [
    {
      title: "Welcome to Ajaia Docs",
      content:
        "<h2>Welcome!</h2><p>This is a sample document to get you started. Try editing this content, or create a new document.</p><ul><li>Use <strong>Bold</strong>, <em>Italic</em>, and <u>Underline</u> formatting</li><li>Add headings and lists</li><li>Upload <code>.txt</code> or <code>.md</code> files to import content</li></ul>",
      ownerId: alice.id,
    },
    {
      title: "Project Notes",
      content:
        "<h3>Project Roadmap</h3><ol><li>Research phase</li><li>Design mockups</li><li>Implementation</li><li>Testing</li><li>Launch</li></ol><p>Deadline: <strong>End of quarter</strong></p>",
      ownerId: alice.id,
    },
    {
      title: "Meeting Notes",
      content:
        "<h2>Team Sync — Monday</h2><p><strong>Attendees:</strong> Alice, Bob, Carol</p><h3>Agenda</h3><ul><li>Review sprint progress</li><li>Plan next iteration</li><li>Discuss blockers</li></ul><p><em>Action items to follow.</em></p>",
      ownerId: bob.id,
    },
  ];

  for (const doc of sampleDocs) {
    const existing = await prisma.document.findFirst({
      where: { title: doc.title, ownerId: doc.ownerId },
    });
    if (!existing) {
      await prisma.document.create({ data: doc });
    }
  }

  console.log("Seed complete.");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
