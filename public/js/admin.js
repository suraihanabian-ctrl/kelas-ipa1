/* Panel admin — statis & tersembunyi, data dikelola lewat API backend */

const $ = (sel) => document.querySelector(sel);
const API = "/api";

let token = sessionStorage.getItem("kelas_token") || null;

function isLoggedIn() {
  return !!token;
}

async function apiFetch(path, method, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = { ok: false, message: "Respons tidak valid" };
  }
  if (res.status === 401) {
    doLogout();
    throw new Error("Sesi berakhir. Silakan masuk ulang.");
  }
  return { status: res.status, ...data };
}

function doLogin() {
  $("#loginBox").classList.add("hidden");
  $("#panelBox").classList.remove("hidden");
  renderSemua();
}

function doLogout() {
  if (token) {
    fetch(API + "/logout", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    }).catch(() => {});
  }
  token = null;
  sessionStorage.removeItem("kelas_token");
  $("#loginForm").reset();
  $("#panelBox").classList.add("hidden");
  $("#loginBox").classList.remove("hidden");
}

/* ============ Anggota ============ */
async function renderAnggota() {
  const box = $("#anggotaList");
  let daftar;
  try {
    const r = await apiFetch("/anggota", "GET");
    daftar = r.data || [];
  } catch (e) {
    box.innerHTML = `<div class="empty-state">${e.message}</div>`;
    return;
  }

  if (daftar.length === 0) {
    box.innerHTML = '<div class="empty-state">Belum ada anggota.</div>';
    return;
  }

  box.innerHTML = "";
  daftar.forEach((a) => {
    const row = document.createElement("div");
    row.className = "list-row";
    const av = a.foto
      ? `<img src="${a.foto}" alt="${a.nama}" />`
      : `<div class="avatar" style="width:52px;height:52px;font-size:1rem;margin:0;flex-shrink:0">${inisial(a.nama)}</div>`;
    row.innerHTML = `
      ${av}
      <div class="info">
        <strong>${a.nama}</strong>
        <span>${a.jabatan}${a.hobi ? " · Hobi: " + a.hobi : ""}</span>
      </div>
      <div class="row-actions">
        <button class="edit" data-id="${a.id}">Edit</button>
        <button class="del" data-id="${a.id}">Hapus</button>
      </div>
    `;
    box.appendChild(row);
  });

  daftar.forEach((a) => {
    box.querySelector(`.edit[data-id="${a.id}"]`).addEventListener("click", () => formAnggota(a));
    box.querySelector(`.del[data-id="${a.id}"]`).addEventListener("click", async () => {
      if (confirm("Yakin ingin menghapus anggota ini?")) {
        try {
          await apiFetch("/anggota/" + a.id, "DELETE");
          renderAnggota();
        } catch (e) {
          alert(e.message);
        }
      }
    });
  });
}

async function formAnggota(anggota) {
  const nama = prompt("Nama lengkap:", anggota ? anggota.nama : "");
  if (nama === null) return;
  const jabatan = prompt("Jabatan (mis. Ketua Kelas):", anggota ? anggota.jabatan : "Anggota") || "Anggota";
  const hobi = prompt("Hobi:", anggota ? anggota.hobi : "");
  const foto = prompt("URL foto (kosongkan jika belum ada):", anggota ? anggota.foto || "" : "");

  try {
    if (anggota) {
      await apiFetch("/anggota/" + anggota.id, "PUT", {
        nama: nama.trim(),
        jabatan: jabatan.trim(),
        hobi: (hobi || "").trim(),
        foto: (foto || "").trim(),
      });
    } else {
      await apiFetch("/anggota", "POST", {
        nama: nama.trim(),
        jabatan: jabatan.trim(),
        hobi: (hobi || "").trim(),
        foto: (foto || "").trim(),
      });
    }
    renderAnggota();
  } catch (e) {
    alert(e.message);
  }
}

/* ============ Galeri Foto ============ */
async function renderFoto() {
  const box = $("#fotoList");
  let foto;
  try {
    const r = await apiFetch("/foto", "GET");
    foto = r.data || [];
  } catch (e) {
    box.innerHTML = `<div class="empty-state">${e.message}</div>`;
    return;
  }

  if (foto.length === 0) {
    box.innerHTML = '<div class="empty-state">Belum ada foto.</div>';
    return;
  }

  box.innerHTML = "";
  foto.forEach((f) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.innerHTML = `
      <img src="${f.url}" alt="${f.judul}" />
      <div class="info">
        <strong>${f.judul}</strong>
        <span>${formatTanggal(f.tanggal)}</span>
      </div>
      <div class="row-actions">
        <button class="edit" data-id="${f.id}">Edit</button>
        <button class="del" data-id="${f.id}">Hapus</button>
      </div>
    `;
    box.appendChild(row);
  });

  foto.forEach((f) => {
    box.querySelector(`.edit[data-id="${f.id}"]`).addEventListener("click", () => formFoto(f));
    box.querySelector(`.del[data-id="${f.id}"]`).addEventListener("click", async () => {
      if (confirm("Yakin ingin menghapus foto ini?")) {
        try {
          await apiFetch("/foto/" + f.id, "DELETE");
          renderFoto();
        } catch (e) {
          alert(e.message);
        }
      }
    });
  });
}

async function formFoto(foto) {
  const judul = prompt("Judul foto:", foto ? foto.judul : "");
  if (judul === null) return;
  const url = prompt("URL gambar:", foto ? foto.url : "");
  if (!url) return;
  const tanggal = prompt("Tanggal (YYYY-MM-DD):", foto ? foto.tanggal : "");

  try {
    if (foto) {
      await apiFetch("/foto/" + foto.id, "PUT", {
        judul: judul.trim(),
        url: url.trim(),
        tanggal: (tanggal || "").trim(),
      });
    } else {
      await apiFetch("/foto", "POST", {
        judul: judul.trim(),
        url: url.trim(),
        tanggal: (tanggal || "").trim(),
      });
    }
    renderFoto();
  } catch (e) {
    alert(e.message);
  }
}

/* ============ Pengaturan ============ */
async function renderPengaturan() {
  try {
    const r = await apiFetch("/pengaturan", "GET");
    const p = r.data || {};
    $("#cfgNama").value = p.nama || "";
    $("#cfgWali").value = p.wali || "";
    $("#cfgTagline").value = p.tagline || "";
  } catch (e) {
    /* biarkan kosong */
  }
}

async function renderSemua() {
  await Promise.all([renderAnggota(), renderFoto(), renderPengaturan()]);
}

/* ============ Inisialisasi ============ */
document.addEventListener("DOMContentLoaded", () => {
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("#username").value.trim();
    const password = $("#password").value;
    try {
      const r = await apiFetch("/login", "POST", { username, password });
      if (r.ok && r.token) {
        token = r.token;
        sessionStorage.setItem("kelas_token", token);
        $("#loginError").style.display = "none";
        doLogin();
      } else {
        $("#loginError").textContent = r.message || "Login gagal.";
        $("#loginError").style.display = "block";
      }
    } catch (err) {
      $("#loginError").textContent = err.message;
      $("#loginError").style.display = "block";
    }
  });

  $("#logoutBtn").addEventListener("click", doLogout);

  document.querySelectorAll(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      $("#panel-" + btn.dataset.tab).classList.remove("hidden");
    })
  );

  $("#btnTambahAnggota").addEventListener("click", () => formAnggota(null));
  $("#btnTambahFoto").addEventListener("click", () => formFoto(null));

  $("#pengaturanForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/pengaturan", "PUT", {
        nama: $("#cfgNama").value.trim(),
        wali: $("#cfgWali").value.trim(),
        tagline: $("#cfgTagline").value.trim(),
      });
      alert("Pengaturan disimpan.");
    } catch (err) {
      alert(err.message);
    }
  });

  $("#keamananForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/keamanan", "PUT", {
        username: $("#newUser").value.trim(),
        password: $("#newPass").value.trim(),
      });
      alert("Kredensial diperbarui.");
      $("#newUser").value = "";
      $("#newPass").value = "";
    } catch (err) {
      alert(err.message);
    }
  });

  if (isLoggedIn()) doLogin();
});