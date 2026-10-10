// Fills one existing user's account with realistic demo data.
//
//   npm run db:seed -- <email> [--reset]
//
// Users only exist through OAuth, so sign in once before seeding. The script
// refuses to touch an account that already has data unless --reset is given,
// which deletes that user's companies, documents, applications, contacts,
// questions and stories first. Other users are never touched.
//
// This runs outside Next.js, so it cannot use src/db/index.ts (server-only,
// env validation) and opens its own short-lived connection instead.
import { existsSync } from "node:fs";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { FOLLOW_UP_STATUSES } from "../src/features/applications/follow-up";
import type {
  ApplicationStatus,
  Competency,
  InterviewStage,
  JobSource,
  QuestionCategory,
  QuestionReadiness,
  WorkType,
} from "../src/db/schema/enum-values";

const {
  applicationContacts,
  applications,
  applicationStatusEvents,
  companies,
  contacts,
  documents,
  interviews,
  questions,
  questionStories,
  stories,
  users,
} = schema;

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// Deterministic, so two runs on the same day produce the same data.
function createRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20261009);
const chance = (probability: number) => random() < probability;
const between = (min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]) => items[between(0, items.length - 1)];

function weighted<T>(items: ReadonlyArray<readonly [T, number]>) {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;

  for (const [item, weight] of items) {
    roll -= weight;

    if (roll < 0) {
      return item;
    }
  }

  return items[items.length - 1][0];
}

const COMPANIES = [
  ["Tokopedia", "https://www.tokopedia.com"],
  ["Gojek", "https://www.gojek.com"],
  ["Traveloka", "https://www.traveloka.com"],
  ["Bukalapak", "https://www.bukalapak.com"],
  ["Blibli", "https://www.blibli.com"],
  ["Ruangguru", "https://www.ruangguru.com"],
  ["Halodoc", "https://www.halodoc.com"],
  ["Xendit", "https://www.xendit.co"],
  ["DANA", "https://www.dana.id"],
  ["OVO", "https://www.ovo.id"],
  ["Kredivo", "https://www.kredivo.id"],
  ["Mekari", "https://mekari.com"],
  ["eFishery", "https://efishery.com"],
  ["Kopi Kenangan", "https://kopikenangan.com"],
  ["Tiket.com", "https://www.tiket.com"],
  ["Bank Jago", "https://www.jago.com"],
  ["Telkom Indonesia", "https://www.telkom.co.id"],
  ["Sirclo", "https://www.sirclo.com"],
  ["Flip", "https://flip.id"],
  ["Stockbit", "https://stockbit.com"],
  ["Pintu", "https://pintu.co.id"],
  ["Bibit", "https://bibit.id"],
] as const;

const POSITIONS = [
  "Frontend Engineer",
  "Backend Engineer",
  "Fullstack Engineer",
  "Software Engineer",
  "Senior Frontend Engineer",
  "React Developer",
  "Node.js Developer",
  "Web Developer",
  "Software Engineer, Platform",
  "Product Engineer",
] as const;

const LOCATIONS = [
  "Jakarta Selatan",
  "Jakarta Pusat",
  "Bandung",
  "Yogyakarta",
  "Surabaya",
  "Tangerang Selatan",
] as const;

const WORK_TYPE_WEIGHTS: ReadonlyArray<readonly [WorkType, number]> = [
  ["hybrid", 5],
  ["remote", 3],
  ["onsite", 2],
];

const SOURCE_WEIGHTS: ReadonlyArray<readonly [JobSource, number]> = [
  ["linkedin", 30],
  ["glints", 18],
  ["jobstreet", 14],
  ["kalibrr", 10],
  ["referral", 10],
  ["other", 6],
];

// How likely a company answers at all, before the CV version is factored in.
const SOURCE_RESPONSE: Record<JobSource, number> = {
  linkedin: 0.34,
  glints: 0.42,
  jobstreet: 0.2,
  kalibrr: 0.3,
  referral: 0.8,
  other: 0.25,
};

const REFERRERS = ["Rina (eks rekan kerja)", "Bayu (teman kuliah)", "Dimas"];
const OTHER_SOURCES = ["Situs karier perusahaan", "Tech in Asia Jobs"];

const CV_VERSIONS = [
  {
    label: "CV Umum v1",
    notes: "Versi pertama, satu CV untuk semua posisi.",
    isArchived: true,
    factor: 0.6,
  },
  {
    label: "CV Frontend v2",
    notes: "Fokus ke proyek React, ringkasan dipersingkat.",
    isArchived: false,
    factor: 1,
  },
  {
    label: "CV Fullstack v3",
    notes: "Tambah angka dampak di tiap proyek dan bagian keahlian backend.",
    isArchived: false,
    factor: 1.45,
  },
] as const;

type SeedQuestion = readonly [text: string, category: QuestionCategory];

const INTERVIEW_QUESTIONS: Record<InterviewStage, readonly SeedQuestion[]> = {
  hr: [
    [
      "Ceritakan tentang diri kamu dan kenapa tertarik dengan posisi ini.",
      "hr_general",
    ],
    ["Berapa ekspektasi gaji kamu?", "hr_general"],
    ["Kenapa ingin pindah dari tempat sekarang?", "hr_general"],
    ["Kapan kamu bisa mulai bekerja?", "hr_general"],
  ],
  technical: [
    [
      "Jelaskan perbedaan Server Component dan Client Component di React.",
      "technical_backend",
    ],
    [
      "Bagaimana kamu mendesain skema database untuk fitur multi-tenant?",
      "system_design",
    ],
    [
      "Apa yang terjadi dari mengetik URL sampai halaman tampil?",
      "technical_backend",
    ],
    ["Bagaimana cara mencegah N+1 query?", "technical_backend"],
    ["Jelaskan cara kerja event loop di Node.js.", "technical_backend"],
  ],
  user: [
    [
      "Ceritakan proyek paling menantang yang pernah kamu kerjakan.",
      "behavioral",
    ],
    [
      "Bagaimana kamu menangani perbedaan pendapat dengan rekan tim?",
      "behavioral",
    ],
    [
      "Bagaimana kamu memprioritaskan pekerjaan saat tenggat berdekatan?",
      "behavioral",
    ],
  ],
  final: [
    ["Apa rencana kamu dalam tiga tahun ke depan?", "hr_general"],
    ["Apa yang kamu harapkan dari atasan dan tim?", "hr_general"],
  ],
  other: [["Ada pertanyaan untuk kami?", "other"]],
};

// Questions written by hand, outside any interview.
const MANUAL_QUESTIONS: readonly SeedQuestion[] = [
  [
    "Ceritakan saat kamu harus mengambil keputusan teknis dengan informasi yang belum lengkap.",
    "behavioral",
  ],
  [
    "Bagaimana kamu mengevaluasi apakah sebuah fitur cocok memakai LLM?",
    "ai_llm",
  ],
  [
    "Bagaimana kamu mendesain antrean pekerjaan yang tahan terhadap duplikasi?",
    "system_design",
  ],
  ["Ceritakan kegagalan yang paling banyak mengajarimu.", "behavioral"],
];

const READINESS_WEIGHTS: ReadonlyArray<readonly [QuestionReadiness, number]> = [
  ["not_ready", 5],
  ["somewhat", 3],
  ["ready", 2],
];

// STAR stories, each with the questions it answers (matched by text).
const STORIES: ReadonlyArray<{
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  competencies: Competency[];
  answers: readonly string[];
}> = [
  {
    title: "Migrasi monolith Laravel ke service tanpa downtime",
    situation:
      "Monolith Laravel yang melayani checkout sudah lambat di jam sibuk. Setiap deploy berarti 5 menit downtime, dan tim produk mulai menunda rilis.",
    task: "Saya diminta memisahkan modul pembayaran jadi service sendiri tanpa mengganggu transaksi yang sedang berjalan.",
    action:
      "Saya petakan dulu semua jalur yang menyentuh tabel pembayaran, lalu pasang **strangler pattern**: endpoint baru hidup berdampingan dengan yang lama dan lalu lintas dipindah bertahap lewat feature flag. Saya tulis skrip rekonsiliasi harian untuk membandingkan dua sumber data selama transisi.",
    result:
      "Migrasi selesai dalam 6 minggu tanpa satu pun transaksi hilang. Deploy modul pembayaran turun dari 5 menit downtime jadi nol, dan tim produk bisa rilis dua kali seminggu.",
    competencies: ["ownership", "technical_depth", "impact"],
    answers: [
      "Ceritakan proyek paling menantang yang pernah kamu kerjakan.",
      "Bagaimana kamu mendesain skema database untuk fitur multi-tenant?",
    ],
  },
  {
    title: "Beda pendapat soal estimasi dengan tech lead",
    situation:
      "Tech lead mengestimasi fitur laporan selesai 1 minggu. Dari pengalaman di modul sebelumnya, saya yakin butuh 3 minggu karena ada agregasi data lama yang belum dinormalisasi.",
    task: "Saya perlu menyampaikan keberatan tanpa terdengar menolak pekerjaan, dan tetap menjaga hubungan baik.",
    action:
      "Saya minta waktu 1 hari untuk membuat *spike*: query contoh di data produksi (anonim) dan daftar kasus tepi yang ditemukan. Lalu saya ajak bicara empat mata dulu, bukan di depan tim, dengan membawa angka, bukan opini.",
    result:
      "Estimasi direvisi jadi 2,5 minggu dan dua kasus tepi masuk ke backlog sebagai tiket terpisah. Fitur rilis tepat waktu sesuai estimasi baru, dan sejak itu spike singkat jadi kebiasaan tim sebelum estimasi.",
    competencies: ["conflict", "collaboration", "ambiguity"],
    answers: [
      "Bagaimana kamu menangani perbedaan pendapat dengan rekan tim?",
      "Ceritakan saat kamu harus mengambil keputusan teknis dengan informasi yang belum lengkap.",
    ],
  },
  {
    title: "Insiden antrean yang memproses pesanan dua kali",
    situation:
      "Worker antrean kadang memproses pesanan yang sama dua kali setelah restart, dan beberapa pelanggan ditagih ganda.",
    task: "Saya yang menulis worker itu, jadi saya ambil tanggung jawab memperbaikinya dan menjelaskan ke tim support.",
    action:
      "Saya tambahkan *idempotency key* per pesanan dan tabel pencatat pekerjaan yang sudah selesai, lalu tulis postmortem tanpa menyalahkan siapa pun, termasuk diri sendiri, dengan fokus ke pengaman yang kurang.",
    result:
      "Tagihan ganda berhenti total. Postmortem itu dipakai sebagai templat insiden berikutnya, dan saya jadi lebih hati-hati menganggap *at-least-once delivery* sebagai *exactly-once*.",
    competencies: ["failure", "ownership", "technical_depth"],
    answers: [
      "Ceritakan kegagalan yang paling banyak mengajarimu.",
      "Bagaimana kamu mendesain antrean pekerjaan yang tahan terhadap duplikasi?",
    ],
  },
  {
    title: "Mengurutkan tiga tenggat yang bertabrakan",
    situation:
      "Dalam satu minggu ada rilis fitur, audit keamanan, dan permintaan data dari tim finance, semuanya ditandai mendesak.",
    task: "Sebagai satu-satunya backend engineer di tim kecil itu, saya harus memutuskan urutan dan mengelola ekspektasi tiga pihak.",
    action:
      "Saya buat tabel kecil: dampak kalau terlambat, siapa yang terdampak, dan berapa lama tiap pekerjaan. Hasilnya saya bagikan ke tiga pemangku kepentingan sekaligus supaya mereka melihat trade-off yang sama.",
    result:
      "Audit dikerjakan dulu (tenggat hukum), permintaan finance diserahkan sebagai query siap pakai dalam 2 jam, dan rilis fitur mundur dua hari atas persetujuan produk. Tidak ada yang merasa dikesampingkan.",
    competencies: ["ambiguity", "collaboration", "leadership"],
    answers: [
      "Bagaimana kamu memprioritaskan pekerjaan saat tenggat berdekatan?",
    ],
  },
  {
    title: "Mentoring engineer baru sampai lepas pendampingan",
    situation:
      "Engineer baru di tim kesulitan memahami arsitektur event-driven kami dan PR-nya sering bolak-balik review.",
    task: "Saya mengajukan diri jadi mentornya selama tiga bulan pertama.",
    action:
      "Kami *pair programming* dua jam seminggu, dan saya minta dia menulis catatan arsitektur versinya sendiri yang kemudian jadi dokumen onboarding tim.",
    result:
      "Setelah dua bulan dia mengerjakan fitur sendiri dengan review satu putaran, dan dokumen onboardingnya dipakai untuk dua orang berikutnya.",
    competencies: ["leadership", "collaboration"],
    answers: [],
  },
];

// Pasted postings, for a few applications.
const JOB_DESCRIPTIONS = [
  `Tentang peran
Kami mencari Backend Engineer untuk tim pembayaran. Kamu akan merancang API, menjaga keandalan sistem antrean, dan bekerja dekat dengan tim produk.

Tanggung jawab
- Merancang dan memelihara layanan backend (Laravel, PostgreSQL, Redis)
- Menulis test otomatis dan menjaga pipeline CI tetap hijau
- Ikut rotasi on-call ringan (satu minggu per dua bulan)

Kualifikasi
- 3+ tahun pengalaman backend
- Paham desain skema relasional dan indexing
- Nilai tambah: pengalaman dengan sistem pembayaran atau event-driven`,
  `Senior Software Engineer (Remote, Indonesia)

Yang akan kamu kerjakan:
Memimpin pengembangan fitur dari diskusi kebutuhan sampai rilis, membimbing engineer yang lebih junior, dan menjaga kualitas kode lewat review.

Yang kami cari:
- Pengalaman 5+ tahun, minimal 2 tahun di tim produk
- Terbiasa dengan Node.js atau PHP, dan PostgreSQL
- Nyaman bekerja asinkron dan menulis dokumen keputusan teknis

Proses: screening HR, tes teknis take-home (maks. 4 jam), interview dengan tim, lalu final dengan CTO.`,
] as const;

const CONTACTS = [
  {
    company: "Tokopedia",
    name: "Sari Wulandari",
    role: "recruiter",
    title: "Talent Acquisition Specialist",
  },
  {
    company: "Gojek",
    name: "Andi Pratama",
    role: "hiring_manager",
    title: "Engineering Manager",
  },
  {
    company: "Xendit",
    name: "Rina Kusuma",
    role: "referral",
    title: "Senior Software Engineer",
  },
  {
    company: "Traveloka",
    name: "Maya Putri",
    role: "recruiter",
    title: "Tech Recruiter",
  },
  {
    company: "Mekari",
    name: "Bayu Saputra",
    role: "referral",
    title: "Frontend Engineer",
  },
  {
    company: "Halodoc",
    name: "Dewi Lestari",
    role: "recruiter",
    title: "People Partner",
  },
] as const;

type SeedEvent = { status: ApplicationStatus; at: Date };

type SeedApplication = {
  company: string;
  position: string;
  source: JobSource;
  sourceDetail: string | null;
  cv: number | null;
  appliedAt: string | null;
  events: SeedEvent[];
  followedUp: boolean;
};

const toDateString = (value: Date) => value.toISOString().slice(0, 10);

// The CV in use at the time: the newer versions replaced the older ones.
function cvFor(daysAgo: number) {
  if (chance(0.08)) {
    return null;
  }

  if (daysAgo > 78) {
    return 0;
  }

  return daysAgo > 40 ? 1 : 2;
}

function sourceDetailFor(source: JobSource) {
  if (source === "referral") {
    return pick(REFERRERS);
  }

  return source === "other" ? pick(OTHER_SOURCES) : null;
}

// Walks one application through the pipeline. Steps that would land in the
// future are dropped, which leaves recent applications mid-process.
function buildSubmitted(now: number, daysAgo: number): SeedApplication {
  const source = weighted(SOURCE_WEIGHTS);
  const cv = cvFor(daysAgo);
  const appliedTime = now - daysAgo * DAY + between(1, 9) * HOUR;
  const events: SeedEvent[] = [];
  let cursor = appliedTime;

  const push = (status: ApplicationStatus, at: number) => {
    events.push({ status, at: new Date(at) });
    cursor = at;
  };

  const advance = (
    status: ApplicationStatus,
    minDays: number,
    maxDays: number,
  ) => {
    const at = cursor + between(minDays, maxDays) * DAY + between(1, 8) * HOUR;

    if (at > now) {
      return false;
    }

    push(status, at);

    return true;
  };

  // Some were saved to the wishlist a few days before applying.
  if (chance(0.2)) {
    push("wishlist", appliedTime - between(1, 6) * DAY);
  }

  // A couple were logged late, straight at the stage they had reached.
  const loggedLate = chance(0.04);

  if (!loggedLate) {
    push("applied", appliedTime);
  }

  const factor = cv === null ? 0.8 : CV_VERSIONS[cv].factor;
  const responds = loggedLate || chance(SOURCE_RESPONSE[source] * factor);
  let followedUp = false;

  if (loggedLate) {
    push("interview", appliedTime + between(6, 12) * DAY);
  } else if (!responds) {
    followedUp = daysAgo > 9 && chance(0.4);
  } else if (chance(0.22)) {
    advance("rejected", 3, 12);
  } else if (advance("screening", 2, 10)) {
    walkPipeline(advance);
  }

  // Whatever stage it stalled at, a long silence usually ends as ghosted.
  const last = events[events.length - 1];

  if (
    FOLLOW_UP_STATUSES.some((status) => status === last.status) &&
    chance(0.88)
  ) {
    advance("ghosted", 21, 26);
  }

  return {
    company: pick(COMPANIES)[0],
    position: pick(POSITIONS),
    source,
    sourceDetail: sourceDetailFor(source),
    cv,
    appliedAt: toDateString(new Date(appliedTime)),
    events,
    followedUp,
  };
}

function walkPipeline(
  advance: (status: ApplicationStatus, min: number, max: number) => boolean,
) {
  if (chance(0.3)) {
    advance("rejected", 2, 7);

    return;
  }

  // Not every company has a technical test.
  if (chance(0.7)) {
    if (!advance("technical_test", 2, 6)) {
      return;
    }

    if (chance(0.35)) {
      advance("rejected", 3, 8);

      return;
    }
  }

  if (!advance("interview", 3, 8)) {
    return;
  }

  if (chance(0.4)) {
    advance("offer", 5, 12);
  } else if (chance(0.6)) {
    advance("rejected", 4, 10);
  }
}

function buildApplications(now: number) {
  const result: SeedApplication[] = [];

  // Applications per week over sixteen weeks: a slow start, a busy middle and
  // a quieter last fortnight.
  const perWeek = [3, 6, 5, 7, 4, 8, 6, 5, 7, 3, 4, 5, 2, 3, 2, 2];

  perWeek.forEach((amount, week) => {
    for (let index = 0; index < amount; index++) {
      result.push(buildSubmitted(now, week * 7 + between(1, 7)));
    }
  });

  for (let index = 0; index < 5; index++) {
    result.push({
      company: pick(COMPANIES)[0],
      position: pick(POSITIONS),
      source: weighted(SOURCE_WEIGHTS),
      sourceDetail: null,
      cv: null,
      appliedAt: null,
      events: [
        { status: "wishlist", at: new Date(now - between(1, 12) * DAY) },
      ],
      followedUp: false,
    });
  }

  return result;
}

function interviewsFor(events: SeedEvent[]) {
  const reached = events.find((event) => event.status === "interview");

  if (!reached) {
    return [];
  }

  const stages: InterviewStage[] = events.some(
    (event) => event.status === "offer",
  )
    ? ["hr", "technical", "final"]
    : chance(0.5)
      ? ["hr", "technical"]
      : ["technical"];

  return stages.map((stage, index) => ({
    stage,
    scheduledAt: new Date(
      reached.at.getTime() + (2 + index * 3) * DAY + between(2, 8) * HOUR,
    ),
    interviewers: stage === "hr" ? "Tim Talent Acquisition" : null,
    questions: INTERVIEW_QUESTIONS[stage].filter(() => chance(0.75)),
    reflection:
      stage === "technical"
        ? "Jawaban soal desain sistem masih kurang terstruktur. Latihan lagi."
        : null,
  }));
}

function parseArguments() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"));

  return { email, reset: args.includes("--reset") };
}

async function main() {
  const { email, reset } = parseArguments();

  if (!email) {
    throw new Error("Usage: npm run db:seed -- <email> [--reset]");
  }

  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }

  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL_UNPOOLED is not set. See .env.example.");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });

  try {
    console.log(`Database: ${new URL(connectionString).host}`);
    console.log(`User:     ${email}`);

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      throw new Error(
        `No user with email ${email}. Sign in to the app once, then run this again.`,
      );
    }

    const existing = await Promise.all(
      [applications, companies, documents, contacts, questions, stories].map(
        async (table) => {
          const [row] = await db
            .select({ value: count() })
            .from(table)
            .where(eq(table.userId, user.id));

          return row.value;
        },
      ),
    );

    if (existing.some((value) => value > 0) && !reset) {
      throw new Error(
        "This user already has data. Pass --reset to delete it and seed again.",
      );
    }

    const now = Date.now();
    const seeded = buildApplications(now);

    await db.transaction(async (tx) => {
      // Questions and stories only point at applications, so they go first.
      // Then applications: they hold the restricting reference to companies,
      // and their events, interviews and contact links go with them.
      await tx.delete(questions).where(eq(questions.userId, user.id));
      await tx.delete(stories).where(eq(stories.userId, user.id));
      await tx.delete(applications).where(eq(applications.userId, user.id));
      await tx.delete(contacts).where(eq(contacts.userId, user.id));
      await tx.delete(documents).where(eq(documents.userId, user.id));
      await tx.delete(companies).where(eq(companies.userId, user.id));

      const usedCompanies = new Set([
        ...seeded.map((application) => application.company),
        ...CONTACTS.map((contact) => contact.company),
      ]);
      const companyRows = await tx
        .insert(companies)
        .values(
          COMPANIES.filter(([name]) => usedCompanies.has(name)).map(
            ([name, website]) => ({ userId: user.id, name, website }),
          ),
        )
        .returning({ id: companies.id, name: companies.name });
      const companyIds = new Map(companyRows.map((row) => [row.name, row.id]));

      const cvRows = await tx
        .insert(documents)
        .values(
          CV_VERSIONS.map(({ label, notes, isArchived }) => ({
            userId: user.id,
            type: "cv" as const,
            label,
            notes,
            isArchived,
            url: "https://drive.google.com/file/d/contoh/view",
          })),
        )
        .returning({ id: documents.id, label: documents.label });
      const cvIds = CV_VERSIONS.map(
        ({ label }) => cvRows.find((row) => row.label === label)?.id ?? null,
      );
      const [coverLetter] = await tx
        .insert(documents)
        .values({
          userId: user.id,
          type: "cover_letter",
          label: "Cover letter umum",
          notes: "Paragraf pembuka disesuaikan per perusahaan.",
        })
        .returning({ id: documents.id });

      const applicationIdsByCompany = new Map<string, string[]>();
      // Stories are linked to questions by their text, see STORIES.answers.
      const questionIdsByText = new Map<string, string>();

      for (const item of seeded) {
        const companyId = companyIds.get(item.company);
        const last = item.events[item.events.length - 1];

        if (!companyId) {
          throw new Error(`Company ${item.company} was not inserted.`);
        }

        const hasSalary = chance(0.45);
        const salaryMin = between(8, 18) * 1_000_000;
        const [application] = await tx
          .insert(applications)
          .values({
            userId: user.id,
            companyId,
            position: item.position,
            source: item.source,
            sourceDetail: item.sourceDetail,
            salaryMin: hasSalary ? salaryMin : null,
            salaryMax: hasSalary ? salaryMin + between(2, 8) * 1_000_000 : null,
            location: pick(LOCATIONS),
            workType: weighted(WORK_TYPE_WEIGHTS),
            appliedAt: item.appliedAt,
            status: last.status,
            statusChangedAt: last.at,
            lastFollowedUpAt:
              item.followedUp && last.status === "applied"
                ? new Date(Math.min(now, last.at.getTime() + 8 * DAY))
                : null,
            cvDocumentId: item.cv === null ? null : cvIds[item.cv],
            coverLetterDocumentId: chance(0.3) ? coverLetter.id : null,
            jobDescription: chance(0.4) ? pick(JOB_DESCRIPTIONS) : null,
            createdAt: item.events[0].at,
            updatedAt: last.at,
          })
          .returning({ id: applications.id });

        await tx.insert(applicationStatusEvents).values(
          item.events.map((event, index) => ({
            userId: user.id,
            applicationId: application.id,
            fromStatus: index === 0 ? null : item.events[index - 1].status,
            toStatus: event.status,
            changedAt: event.at,
            createdAt: event.at,
          })),
        );

        for (const { questions: asked, ...row } of interviewsFor(item.events)) {
          const [interview] = await tx
            .insert(interviews)
            .values({ ...row, userId: user.id, applicationId: application.id })
            .returning({ id: interviews.id });

          if (asked.length === 0) {
            continue;
          }

          const questionRows = await tx
            .insert(questions)
            .values(
              asked.map(([text, category], index) => ({
                userId: user.id,
                interviewId: interview.id,
                applicationId: application.id,
                source: "interview" as const,
                text,
                category,
                readiness: weighted(READINESS_WEIGHTS),
                createdAt: new Date(row.scheduledAt.getTime() + index),
              })),
            )
            .returning({ id: questions.id, text: questions.text });

          for (const question of questionRows) {
            questionIdsByText.set(question.text, question.id);
          }
        }

        applicationIdsByCompany.set(item.company, [
          ...(applicationIdsByCompany.get(item.company) ?? []),
          application.id,
        ]);
      }

      for (const contact of CONTACTS) {
        const slug = contact.name.toLowerCase().replace(" ", ".");
        const [row] = await tx
          .insert(contacts)
          .values({
            userId: user.id,
            companyId: companyIds.get(contact.company) ?? null,
            name: contact.name,
            role: contact.role,
            title: contact.title,
            email: `${slug}@example.com`,
            linkedinUrl: `https://www.linkedin.com/in/${slug.replace(".", "-")}`,
          })
          .returning({ id: contacts.id });
        const linked = (
          applicationIdsByCompany.get(contact.company) ?? []
        ).slice(0, 2);

        if (linked.length > 0) {
          await tx.insert(applicationContacts).values(
            linked.map((applicationId) => ({
              userId: user.id,
              applicationId,
              contactId: row.id,
            })),
          );
        }
      }

      const manualRows = await tx
        .insert(questions)
        .values(
          MANUAL_QUESTIONS.map(([text, category], index) => ({
            userId: user.id,
            source: "manual" as const,
            text,
            category,
            readiness: weighted(READINESS_WEIGHTS),
            notes:
              index === 0
                ? "Pakai cerita estimasi; tekankan spike 1 hari sebelum memutuskan."
                : null,
            createdAt: new Date(now - between(1, 20) * DAY),
          })),
        )
        .returning({ id: questions.id, text: questions.text });

      for (const question of manualRows) {
        questionIdsByText.set(question.text, question.id);
      }

      for (const [index, story] of STORIES.entries()) {
        const { answers, ...values } = story;
        const [row] = await tx
          .insert(stories)
          .values({
            ...values,
            userId: user.id,
            createdAt: new Date(now - (30 - index * 5) * DAY),
            updatedAt: new Date(now - (10 - index * 2) * DAY),
          })
          .returning({ id: stories.id });
        const linked = answers.flatMap((text) => {
          const questionId = questionIdsByText.get(text);

          return questionId ? [questionId] : [];
        });

        if (linked.length > 0) {
          await tx.insert(questionStories).values(
            linked.map((questionId) => ({
              userId: user.id,
              questionId,
              storyId: row.id,
            })),
          );
        }
      }
    });

    console.log(
      `Seeded ${seeded.length} applications, ${STORIES.length} stories and ${MANUAL_QUESTIONS.length} manual questions.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
