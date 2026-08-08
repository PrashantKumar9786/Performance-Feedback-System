/* eslint-disable no-console */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PARAMETERS = [
  {
    key: 'ownership',
    name: 'Ownership',
    description: 'Takes responsibility for outcomes and follows through without prompting.',
    sortOrder: 1,
  },
  {
    key: 'communication',
    name: 'Communication',
    description: 'Shares clearly, listens well, and keeps stakeholders aligned.',
    sortOrder: 2,
  },
  {
    key: 'quality_of_work',
    name: 'Quality of Work',
    description: 'Delivers thorough, accurate work that meets the bar.',
    sortOrder: 3,
  },
  {
    key: 'collaboration',
    name: 'Collaboration',
    description: 'Works constructively with others and elevates the team.',
    sortOrder: 4,
  },
  {
    key: 'reliability',
    name: 'Reliability',
    description: 'Consistent delivery against commitments and timelines.',
    sortOrder: 5,
  },
];

const PASSWORD = 'password123';

async function upsertUser({ email, name, title, role, companyId, managerId, passwordHash }) {
  return prisma.user.upsert({
    where: { companyId_email: { companyId, email } },
    update: { name, title, role, managerId, passwordHash },
    create: { email, name, title, role, companyId, managerId, passwordHash },
  });
}

function scoreSet(paramIds, base, comments) {
  return paramIds.map((parameterId, i) => ({
    parameterId,
    score: Math.min(5, Math.max(1, base + (i % 3) - 1)),
    comment: comments[i],
  }));
}

async function createSubmission({ cycleId, managerId, employeeId, scores }) {
  const existing = await prisma.feedbackSubmission.findUnique({
    where: { cycleId_employeeId: { cycleId, employeeId } },
  });
  if (existing) {
    await prisma.feedbackScore.deleteMany({ where: { submissionId: existing.id } });
    await prisma.feedbackSubmission.delete({ where: { id: existing.id } });
  }

  return prisma.feedbackSubmission.create({
    data: {
      cycleId,
      managerId,
      employeeId,
      scores: { create: scores },
    },
  });
}

async function ensureCycle(companyId, year, month, status) {
  const label = new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  return prisma.feedbackCycle.upsert({
    where: { companyId_year_month: { companyId, year, month } },
    update: { label, status },
    create: { companyId, year, month, label, status },
  });
}

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const p of PARAMETERS) {
    await prisma.feedbackParameter.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, sortOrder: p.sortOrder },
      create: p,
    });
  }

  const params = await prisma.feedbackParameter.findMany({ orderBy: { sortOrder: 'asc' } });
  const paramIds = params.map((p) => p.id);

  // ─── Ashoka Textiles: hierarchical ─────────────────────────────────────────
  // COO → Rohan → Priya → 6 team members. Kavita (HR) tracks completion.
  const ashoka = await prisma.company.upsert({
    where: { slug: 'ashoka-textiles' },
    update: { name: 'Ashoka Textiles' },
    create: { name: 'Ashoka Textiles', slug: 'ashoka-textiles' },
  });

  const coo = await upsertUser({
    email: 'meera.coo@ashoka.test',
    name: 'Meera Shah',
    title: 'Chief Operating Officer',
    role: 'MANAGER',
    companyId: ashoka.id,
    managerId: null,
    passwordHash,
  });

  const rohan = await upsertUser({
    email: 'rohan@ashoka.test',
    name: 'Rohan Mehta',
    title: 'Head of Operations',
    role: 'MANAGER',
    companyId: ashoka.id,
    managerId: coo.id,
    passwordHash,
  });

  const priya = await upsertUser({
    email: 'priya@ashoka.test',
    name: 'Priya Nair',
    title: 'Team Lead — Production',
    role: 'MANAGER',
    companyId: ashoka.id,
    managerId: rohan.id,
    passwordHash,
  });

  const kavita = await upsertUser({
    email: 'kavita.hr@ashoka.test',
    name: 'Kavita Desai',
    title: 'HR Lead',
    role: 'HR',
    companyId: ashoka.id,
    // HR is not in the monthly performance review chain for this pilot.
    managerId: null,
    passwordHash,
  });

  const ashokaTeamNames = [
    ['Aisha Khan', 'aisha@ashoka.test', 'Production Associate'],
    ['Vikram Patel', 'vikram@ashoka.test', 'Quality Analyst'],
    ['Neha Joshi', 'neha@ashoka.test', 'Process Engineer'],
    ['Arjun Reddy', 'arjun@ashoka.test', 'Shift Supervisor'],
    ['Sana Iqbal', 'sana@ashoka.test', 'Inventory Coordinator'],
    ['Dev Malhotra', 'dev@ashoka.test', 'Floor Associate'],
  ];

  const priyaTeam = [];
  for (const [name, email, title] of ashokaTeamNames) {
    priyaTeam.push(
      await upsertUser({
        email,
        name,
        title,
        role: 'EMPLOYEE',
        companyId: ashoka.id,
        managerId: priya.id,
        passwordHash,
      })
    );
  }

  const ashokaMay = await ensureCycle(ashoka.id, 2026, 5, 'CLOSED');
  const ashokaJun = await ensureCycle(ashoka.id, 2026, 6, 'CLOSED');
  const ashokaJul = await ensureCycle(ashoka.id, 2026, 7, 'OPEN');

  // Reset cycle submissions so re-seeding restores the intended demo state.
  await prisma.feedbackSubmission.deleteMany({
    where: { cycleId: { in: [ashokaMay.id, ashokaJun.id, ashokaJul.id] } },
  });

  // Past closed cycles: full hierarchy submitted
  for (const cycle of [ashokaMay, ashokaJun]) {
    const offset = cycle.month === 5 ? 0 : 1;
    await createSubmission({
      cycleId: cycle.id,
      managerId: coo.id,
      employeeId: rohan.id,
      scores: scoreSet(paramIds, 4 + offset, [
        'Owns the ops roadmap and drives decisions to close.',
        'Clear updates to leadership; escalates early.',
        'High bar on process quality across plants.',
        'Aligns plant leads without friction.',
        'Hits monthly targets consistently.',
      ]),
    });
    await createSubmission({
      cycleId: cycle.id,
      managerId: rohan.id,
      employeeId: priya.id,
      scores: scoreSet(paramIds, 3 + offset, [
        'Owns her line’s outcomes and coaches the team through blockers.',
        'Keeps Rohan informed with crisp daily standups.',
        'Work quality on the floor has steadily improved.',
        'Strong peer partnership with QA and inventory.',
        'Reliable on shift plans and overtime coverage.',
      ]),
    });
    for (let i = 0; i < priyaTeam.length; i += 1) {
      const member = priyaTeam[i];
      await createSubmission({
        cycleId: cycle.id,
        managerId: priya.id,
        employeeId: member.id,
        scores: scoreSet(paramIds, 3 + (i % 2), [
          `${member.name.split(' ')[0]} takes ownership of assigned stations.`,
          'Communicates issues before they become escalations.',
          'Output quality meets our inspection standards.',
          'Helpful with newer teammates on the line.',
          'Shows up prepared and hits shift commitments.',
        ]),
      });
    }
  }

  // Open July cycle: Priya has submitted for 4/6; Rohan submitted for Priya; COO pending for Rohan
  for (let i = 0; i < 4; i += 1) {
    const member = priyaTeam[i];
    await createSubmission({
      cycleId: ashokaJul.id,
      managerId: priya.id,
      employeeId: member.id,
      scores: scoreSet(paramIds, 4, [
        'Strong ownership this month on throughput goals.',
        'Proactive communication during the monsoon disruption.',
        'Quality held steady despite rush orders.',
        'Collaborated well across shifts.',
        'Dependable attendance and handovers.',
      ]),
    });
  }
  await createSubmission({
    cycleId: ashokaJul.id,
    managerId: rohan.id,
    employeeId: priya.id,
    scores: scoreSet(paramIds, 4, [
      'Led the team through peak season with clear ownership.',
      'Transparent status reporting to ops leadership.',
      'Raised the quality bar on finishing checks.',
      'Coordinated tightly with logistics this month.',
      'Delivered every weekly commitment.',
    ]),
  });
  // Kavita does not give performance feedback in this pilot; pending: Priya→Sana, Priya→Dev, COO→Rohan

  // ─── Bright Path Consulting: flat ──────────────────────────────────────────
  // Founder Ananya gives feedback directly to ~8 people. No middle layer.
  const bright = await prisma.company.upsert({
    where: { slug: 'bright-path' },
    update: { name: 'Bright Path Consulting' },
    create: { name: 'Bright Path Consulting', slug: 'bright-path' },
  });

  const ananya = await upsertUser({
    email: 'ananya@brightpath.test',
    name: 'Ananya Rao',
    title: 'Founder & CEO',
    role: 'MANAGER',
    companyId: bright.id,
    managerId: null,
    passwordHash,
  });

  const brightHr = await upsertUser({
    email: 'hr@brightpath.test',
    name: 'Leela Krishnan',
    title: 'People Partner',
    role: 'HR',
    companyId: bright.id,
    managerId: null,
    passwordHash,
  });

  const brightNames = [
    ['Omar Farooq', 'omar@brightpath.test', 'Senior Consultant'],
    ['Mia Chen', 'mia@brightpath.test', 'Strategy Consultant'],
    ['Jonah Blake', 'jonah@brightpath.test', 'Engagement Manager'],
    ['Rita Sen', 'rita@brightpath.test', 'Research Analyst'],
    ['Carlos Mendes', 'carlos@brightpath.test', 'Consultant'],
    ['Hannah Okonkwo', 'hannah@brightpath.test', 'Consultant'],
    ['Eli Park', 'eli@brightpath.test', 'Associate'],
    ['Tara Singh', 'tara@brightpath.test', 'Associate'],
  ];

  const brightTeam = [];
  for (const [name, email, title] of brightNames) {
    brightTeam.push(
      await upsertUser({
        email,
        name,
        title,
        role: 'EMPLOYEE',
        companyId: bright.id,
        managerId: ananya.id,
        passwordHash,
      })
    );
  }

  const brightMay = await ensureCycle(bright.id, 2026, 5, 'CLOSED');
  const brightJun = await ensureCycle(bright.id, 2026, 6, 'CLOSED');
  const brightJul = await ensureCycle(bright.id, 2026, 7, 'OPEN');

  await prisma.feedbackSubmission.deleteMany({
    where: { cycleId: { in: [brightMay.id, brightJun.id, brightJul.id] } },
  });

  for (const cycle of [brightMay, brightJun]) {
    for (let i = 0; i < brightTeam.length; i += 1) {
      const member = brightTeam[i];
      await createSubmission({
        cycleId: cycle.id,
        managerId: ananya.id,
        employeeId: member.id,
        scores: scoreSet(paramIds, 3 + (i % 3 === 0 ? 1 : 0), [
          `${member.name.split(' ')[0]} owned client workstreams end-to-end.`,
          'Clear client and internal communication.',
          'Deliverables were polished and insight-led.',
          'Partnered well across workstreams.',
          'Reliable against engagement milestones.',
        ]),
      });
    }
  }

  // Open July: founder submitted for 5 of 8 — HR can see 3 pending
  for (let i = 0; i < 5; i += 1) {
    const member = brightTeam[i];
    await createSubmission({
      cycleId: brightJul.id,
      managerId: ananya.id,
      employeeId: member.id,
      scores: scoreSet(paramIds, 4, [
        'Took clear ownership of the Q3 engagement plan.',
        'Kept the client aligned with weekly narratives.',
        'Analysis quality continues to raise the firm bar.',
        'Supportive of newer associates on the team.',
        'Met every delivery date this cycle.',
      ]),
    });
  }

  console.log('\nSeed complete.\n');
  console.log('Demo password for all users: password123\n');
  console.log('Ashoka Textiles');
  console.log('  Priya (manager of 6):     priya@ashoka.test');
  console.log('  Rohan (Priya’s manager):  rohan@ashoka.test');
  console.log('  Meera COO:                meera.coo@ashoka.test');
  console.log('  Kavita HR:                kavita.hr@ashoka.test');
  console.log('  Employee example:         aisha@ashoka.test');
  console.log('\nBright Path Consulting');
  console.log('  Ananya (founder):         ananya@brightpath.test');
  console.log('  Leela HR:                 hr@brightpath.test');
  console.log('  Employee example:         omar@brightpath.test');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
