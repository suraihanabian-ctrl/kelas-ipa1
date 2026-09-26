/* ===== URL backend (Cloudflare Worker) ===== */
const API_BASE = "https://kelas-api.suraihanabian.workers.dev";

/* ===== Konfigurasi kelas (fallback lokal) ===== */
const KELAS = {
  nama: "XII IPA 1",
  namaLengkap: "Kelas XII IPA 1 — Angkatan 2026",
  tagline: "Satu kelas, satu keluarga, jutaan kenangan.",
  deskripsi:
    "Website resmi kelas kami. Dokumentasi momen-momen berharga, profil teman-teman sekelas, dan informasi resmi tentang kelas kami — semuanya ada di sini.",
  tahunAjaran: "2025/2026",
  wali: "Ibu Sri Wahyuni, S.Pd."
};

const DEFAULT_ANGGOTA = [
  { id: "a1", nama: "Andi Pratama", jabatan: "Ketua Kelas", hobi: "Bulu tangkis", foto: "" },
  { id: "a2", nama: "Bella Anjani", jabatan: "Wakil Ketua", hobi: "Membaca novel", foto: "" },
  { id: "a3", nama: "Citra Maharani", jabatan: "Sekretaris", hobi: "Menulis", foto: "" },
  { id: "a4", nama: "Dedi Saputra", jabatan: "Bendahara", hobi: "Catur", foto: "" },
  { id: "a5", nama: "Eka Ramadhani", jabatan: "Anggota", hobi: "Menyanyi", foto: "" },
  { id: "a6", nama: "Fajar Nugroho", jabatan: "Anggota", hobi: "Sepak bola", foto: "" },
  { id: "a7", nama: "Gita Puspita", jabatan: "Anggota", hobi: "Melukis", foto: "" },
  { id: "a8", nama: "Hendra Wijaya", jabatan: "Anggota", hobi: "Basket", foto: "" }
];

const DEFAULT_FOTO = [
  { id: "f1", url: "https://picsum.photos/seed/kelas1/800/600", judul: "Pembukaan MPLS", tanggal: "2025-07-15" },
  { id: "f2", url: "https://picsum.photos/seed/kelas2/800/600", judul: "Upacara Bendera", tanggal: "2025-08-17" },
  { id: "f3", url: "https://picsum.photos/seed/kelas3/800/600", judul: "Kegiatan Studi Banding", tanggal: "2025-09-10" },
  { id: "f4", url: "https://picsum.photos/seed/kelas4/800/600", judul: "Ekskul Basket", tanggal: "2025-10-05" },
  { id: "f5", url: "https://picsum.photos/seed/kelas5/800/600", judul: "Fotobersama Hari Guru", tanggal: "2025-11-25" },
  { id: "f6", url: "https://picsum.photos/seed/kelas6/800/600", judul: "Bakti Sosial", tanggal: "2025-12-08" },
  { id: "f7", url: "https://picsum.photos/seed/kelas7/800/600", judul: "Perpisahan Semester", tanggal: "2026-01-20" },
  { id: "f8", url: "https://picsum.photos/seed/kelas8/800/600", judul: "Class Meeting", tanggal: "2026-03-11" }
];

const DEFAULT_PENGATURAN = {
  nama: KELAS.nama,
  wali: KELAS.wali,
  tagline: KELAS.tagline
};

/* ===== Data cache publik ===== */
let DATA = {
  anggota: DEFAULT_ANGGOTA,
  foto: DEFAULT_FOTO,
  pengaturan: DEFAULT_PENGATURAN,
  remote: false
};

async function loadPublicData() {
  try {
    const res = await fetch(API_BASE + "/api/data");
    if (res.ok) {
      const d = await res.json();
      DATA = {
        anggota: d.anggota || DEFAULT_ANGGOTA,
        foto: d.foto || DEFAULT_FOTO,
        pengaturan: d.pengaturan || DEFAULT_PENGATURAN,
        remote: true
      };
    }
  } catch (e) {
    /* offline / buka lokal -> pakai data default */
  }
  document.dispatchEvent(new Event("kelas-data-ready"));
}

function getAnggota() {
  return DATA.anggota;
}

function getFoto() {
  return DATA.foto;
}

function getPengaturan() {
  return DATA.pengaturan;
}

function inisial(nama) {
  return (nama || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatTanggal(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/* ===== Navigasi ===== */
function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-links a[data-page]").forEach((a) => {
    if (a.dataset.page === page) a.classList.add("active");
  });
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle) toggle.addEventListener("click", () => links.classList.toggle("open"));
  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") links.classList.remove("open");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  initNav();
  loadPublicData();
});