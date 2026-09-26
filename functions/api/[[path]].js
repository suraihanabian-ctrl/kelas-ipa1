import { DEFAULT_ANGGOTA, DEFAULT_FOTO, DEFAULT_PENGATURAN } from "./data.js";

const KV = "KELAS_KV";
const SESSION_TTL = 60 * 60 * 24;
const TOKEN_LENGTH = 24;
const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function randomToken() {
  let out = "";
  const rand = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(rand);
  for (let i = 0; i < TOKEN_LENGTH; i++) out += CHARS[rand[i] % CHARS.length];
  return out;
}

async function readData(kv, key, fallback) {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeData(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

async function getCred(kv, env) {
  const stored = await kv.get("admin_cred");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      /* lanjut default */
    }
  }
  return { username: env.ADMIN_USER || "admin", password: env.DEFAULT_PASSWORD || "kelas2026" };
}

async function isAuthed(request, kv) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return false;
  return (await kv.get("sess_" + token)) === "1";
}

async function createSession(kv, cred) {
  let token = randomToken();
  while ((await kv.get("sess_" + token)) !== null) token = randomToken();
  await kv.put("sess_" + token, "1", { expirationTtl: SESSION_TTL });
  return token;
}

async function handleData(ctx) {
  const { env, request } = ctx;
  const kv = env[KV];
  const soft = await readData(kv, "data", {
    anggota: DEFAULT_ANGGOTA,
    foto: DEFAULT_FOTO,
    pengaturan: DEFAULT_PENGATURAN,
  });

  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");

  if (url.pathname === "/api/data" && method === "GET") {
    return json({ anggota: soft.anggota, foto: soft.foto, pengaturan: soft.pengaturan });
  }

  if (url.pathname === "/api/login" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "Format tidak valid" }, 400);
    }
    const cred = await getCred(kv, env);
    const u = (body.username || "").trim();
    const p = (body.password || "").trim();
    if (u === cred.username && p === cred.password) {
      const token = await createSession(kv, cred);
      return json({ ok: true, token });
    }
    return json({ ok: false, message: "Username atau password salah" }, 401);
  }

  if (url.pathname === "/api/logout" && method === "POST") {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) await kv.delete("sess_" + token);
    return json({ ok: true });
  }

  if (method === "OPTIONS") {
    return json({ ok: true });
  }

  if (!(await isAuthed(request, kv))) {
    return json({ ok: false, message: "Tidak berhak. Silakan masuk ulang." }, 401);
  }

  if (path === "anggota" && method === "GET") return json({ ok: true, data: soft.anggota });

  if (path === "anggota" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "Format tidak valid" }, 400);
    }
    if (!body.nama || !String(body.nama).trim()) {
      return json({ ok: false, message: "Nama wajib diisi" }, 400);
    }
    const item = {
      id: "a" + Date.now(),
      nama: String(body.nama).trim(),
      jabatan: String(body.jabatan || "Anggota").trim(),
      hobi: String(body.hobi || "").trim(),
      foto: String(body.foto || "").trim(),
    };
    soft.anggota.push(item);
    await writeData(kv, "data", soft);
    return json({ ok: true, data: soft.anggota });
  }

  if (path.startsWith("anggota/") && method === "PUT") {
    const id = path.slice("anggota/".length);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "Format tidak valid" }, 400);
    }
    const idx = soft.anggota.findIndex((a) => a.id === id);
    if (idx === -1) return json({ ok: false, message: "Tidak ditemukan" }, 404);
    soft.anggota[idx] = {
      ...soft.anggota[idx],
      nama: String(body.nama || soft.anggota[idx].nama).trim(),
      jabatan: String(body.jabatan || "Anggota").trim(),
      hobi: String(body.hobi || "").trim(),
      foto: String(body.foto || "").trim(),
    };
    await writeData(kv, "data", soft);
    return json({ ok: true, data: soft.anggota });
  }

  if (path.startsWith("anggota/") && method === "DELETE") {
    const id = path.slice("anggota/".length);
    soft.anggota = soft.anggota.filter((a) => a.id !== id);
    await writeData(kv, "data", soft);
    return json({ ok: true, data: soft.anggota });
  }

  if (path === "foto" && method === "GET") return json({ ok: true, data: soft.foto });

  if (path === "foto" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "Format tidak valid" }, 400);
    }
    if (!body.url || !String(body.url).trim()) {
      return json({ ok: false, message: "URL gambar wajib diisi" }, 400);
    }
    const item = {
      id: "f" + Date.now(),
      judul: String(body.judul || "Tanpa judul").trim(),
      url: String(body.url).trim(),
      tanggal: String(body.tanggal || "").trim(),
    };
    soft.foto.push(item);
    await writeData(kv, "data", soft);
    return json({ ok: true, data: soft.foto });
  }

  if (path.startsWith("foto/") && method === "PUT") {
    const id = path.slice("foto/".length);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "Format tidak valid" }, 400);
    }
    const idx = soft.foto.findIndex((f) => f.id === id);
    if (idx === -1) return json({ ok: false, message: "Tidak ditemukan" }, 404);
    soft.foto[idx] = {
      ...soft.foto[idx],
      judul: String(body.judul || soft.foto[idx].judul).trim(),
      url: String(body.url || soft.foto[idx].url).trim(),
      tanggal: String(body.tanggal || "").trim(),
    };
    await writeData(kv, "data", soft);
    return json({ ok: true, data: soft.foto });
  }

  if (path.startsWith("foto/") && method === "DELETE") {
    const id = path.slice("foto/".length);
    soft.foto = soft.foto.filter((f) => f.id !== id);
    await writeData(kv, "data", soft);
    return json({ ok: true, data: soft.foto });
  }

  if (path === "pengaturan" && method === "GET") {
    return json({ ok: true, data: soft.pengaturan });
  }

  if (path === "pengaturan" && method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "Format tidak valid" }, 400);
    }
    soft.pengaturan = {
      nama: String(body.nama || soft.pengaturan.nama || "").trim(),
      wali: String(body.wali || soft.pengaturan.wali || "").trim(),
      tagline: String(body.tagline || soft.pengaturan.tagline || "").trim(),
    };
    await writeData(kv, "data", soft);
    return json({ ok: true, data: soft.pengaturan });
  }

  if (path === "keamanan" && method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "Format tidak valid" }, 400);
    }
    const cred = await getCred(kv, env);
    const nu = String(body.username || "").trim();
    const np = String(body.password || "").trim();
    if (!nu && !np) return json({ ok: false, message: "Isi minimal salah satu kolom" }, 400);
    const updated = {
      username: nu || cred.username,
      password: np || cred.password,
    };
    await kv.put("admin_cred", JSON.stringify(updated));
    return json({ ok: true });
  }

  return json({ ok: false, message: "Rute tidak dikenal" }, 404);
}

export const onRequest = handleData;