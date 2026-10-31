// kompic-next Frontend Application Controller
let authPassword = sessionStorage.getItem("kompic_auth") || "";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  startMetricsPolling();
  loadSettings();
});

// Autentikasi
function checkAuth() {
  fetch("/api/stats", {
    headers: { "X-Admin-Password": authPassword }
  })
    .then(res => {
      if (res.status === 401) {
        document.getElementById("authModal").style.display = "flex";
      } else {
        document.getElementById("authModal").style.display = "none";
        refreshDashboard();
      }
    })
    .catch(() => {
      // Offline or network error
    });
}

function verifyPassword() {
  const pwd = document.getElementById("authPassword").value;
  fetch("/api/stats", {
    headers: { "X-Admin-Password": pwd }
  }).then(res => {
    if (res.ok) {
      authPassword = pwd;
      sessionStorage.setItem("kompic_auth", pwd);
      document.getElementById("authModal").style.display = "none";
      document.getElementById("authError").style.display = "none";
      refreshDashboard();
      loadSettings();
    } else {
      document.getElementById("authError").style.display = "block";
    }
  });
}

// Navigasi Tab
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add("active");

  const links = document.querySelectorAll(".nav-link");
  links.forEach(l => {
    if (l.getAttribute("onclick") && l.getAttribute("onclick").includes(tabId)) {
      l.classList.add("active");
    }
  });

  const titles = {
    dashboard: "Dashboard Ringkasan",
    pipeline: "Pipeline Real-time",
    activity: "Log & Riwayat Kompresi",
    settings: "Konfigurasi Sistem"
  };
  document.getElementById("pageTitle").innerText = titles[tabId] || "kompic-next";

  if (tabId === "activity") {
    loadAllFiles();
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// Polling Metrik Realtime
function startMetricsPolling() {
  setInterval(() => {
    if (authPassword || document.getElementById("authModal").style.display === "none") {
      refreshDashboard();
    }
  }, 4000);
}

function refreshDashboard() {
  // 1. Stats
  fetch("/api/stats", { headers: { "X-Admin-Password": authPassword } })
    .then(r => r.json())
    .then(data => {
      const savedBytes = data.total_saved_bytes || 0;
      document.getElementById("valSaved").innerText = formatBytes(savedBytes);
      const processed = data.total_processed || 0;
      document.getElementById("valProcessed").innerText = processed;

      const totalOrig = data.total_original_bytes || 1;
      const ratio = totalOrig > 0 ? ((savedBytes / totalOrig) * 100).toFixed(1) : 0;
      document.getElementById("subSavedRatio").innerText = `Rasio efisiensi: ${ratio}%`;
    })
    .catch(() => {});

  // 2. System Hardware Metrics
  fetch("/api/system", { headers: { "X-Admin-Password": authPassword } })
    .then(r => r.json())
    .then(hw => {
      // Suhu
      const temp = hw.cpu_temp_c || 0;
      document.getElementById("valTemp").innerText = `${temp.toFixed(1)} °C`;
      document.getElementById("gaugeTempVal").innerText = Math.round(temp);

      const circle = document.getElementById("tempGaugeCircle");
      if (circle) {
        // Circumference = 2 * PI * 45 ≈ 283
        const maxT = 80;
        const pct = Math.min(Math.max(temp / maxT, 0), 1);
        const offset = 283 - (pct * 283);
        circle.style.strokeDashoffset = offset;

        if (temp > 68) {
          circle.style.stroke = "var(--danger)";
          document.getElementById("thermalDot").style.background = "var(--danger)";
          document.getElementById("thermalDot").style.boxShadow = "0 0 8px var(--danger)";
          document.getElementById("engineStatusText").innerText = "Thermal: Throttling (>68°C)";
        } else if (temp > 60) {
          circle.style.stroke = "var(--warning)";
          document.getElementById("thermalDot").style.background = "var(--warning)";
          document.getElementById("thermalDot").style.boxShadow = "0 0 8px var(--warning)";
          document.getElementById("engineStatusText").innerText = "Thermal: Hangat";
        } else {
          circle.style.stroke = "var(--success)";
          document.getElementById("thermalDot").style.background = "var(--success)";
          document.getElementById("thermalDot").style.boxShadow = "0 0 8px var(--success)";
          document.getElementById("engineStatusText").innerText = "Thermal Guard: Aman";
        }
      }

      // RAM
      const ramUsed = hw.ram_used_mb || 0;
      const ramTotal = hw.ram_total_mb || 2048;
      document.getElementById("valRam").innerText = `${ramUsed} MB`;
      document.getElementById("subRamTotal").innerText = `dari ${ramTotal} MB RAM`;

      // Load Avg & Uptime
      document.getElementById("valLoad").innerText = `${hw.load_1 || '0.10'}, ${hw.load_5 || '0.15'}, ${hw.load_15 || '0.20'}`;
      if (hw.uptime_text) document.getElementById("valUptime").innerText = hw.uptime_text;

      // Disk Media
      if (hw.media_disk_used) {
        document.getElementById("diskUsed").innerText = hw.media_disk_used;
        document.getElementById("diskFree").innerText = hw.media_disk_free;
        document.getElementById("diskBar").style.width = `${hw.media_disk_pct || 0}%`;
      }
    })
    .catch(() => {});

  // 3. Recent Files
  fetch("/api/files?limit=5", { headers: { "X-Admin-Password": authPassword } })
    .then(r => r.json())
    .then(files => {
      const tbody = document.getElementById("recentFilesTable");
      if (!files || files.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:24px;">Belum ada media yang dioptimasi. Menunggu file baru di Immich.</td></tr>`;
        return;
      }
      tbody.innerHTML = files.map(f => renderFileRow(f)).join("");
    })
    .catch(() => {});
}

function renderFileRow(f) {
  const saved = f.original_size - f.compressed_size;
  const savedText = saved > 0 ? formatBytes(saved) : "0 B (Skip)";
  const savedBadge = saved > 0 ? "badge-success" : "badge-warning";
  const dateStr = f.timestamp ? new Date(f.timestamp).toLocaleTimeString() : "--";
  const filename = f.file_path ? f.file_path.split("/").pop() : "media";

  return `
    <tr>
      <td style="font-weight:600; font-family:'JetBrains Mono', monospace; font-size:0.8rem;">${filename}</td>
      <td>${formatBytes(f.original_size)}</td>
      <td>${formatBytes(f.compressed_size)}</td>
      <td><span class="badge-tag ${savedBadge}">${savedText}</span></td>
      <td><span class="badge-tag badge-info">GPS Terlindungi</span></td>
      <td style="color:var(--text-dim); font-size:0.78rem;">${dateStr}</td>
    </tr>
  `;
}

function loadAllFiles() {
  fetch("/api/files?limit=100", { headers: { "X-Admin-Password": authPassword } })
    .then(r => r.json())
    .then(files => {
      const tbody = document.getElementById("allFilesTable");
      if (!files || files.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:24px;">Belum ada media.</td></tr>`;
        return;
      }
      tbody.innerHTML = files.map(f => renderFileRow(f)).join("");
    });
}

function filterLogTable() {
  const query = document.getElementById("logSearch").value.toLowerCase();
  const rows = document.querySelectorAll("#allFilesTable tr");
  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    r.style.display = text.includes(query) ? "" : "none";
  });
}

// Settings Form Handlers
function loadSettings() {
  fetch("/api/settings", { headers: { "X-Admin-Password": authPassword } })
    .then(r => r.json())
    .then(cfg => {
      if (!cfg || !cfg.server) return;
      document.getElementById("cfgPort").value = cfg.server.port || 3333;
      document.getElementById("cfgImmichDir").value = cfg.storage.immich_upload_dir || "/mnt/hdd1/immich/upload/upload";
      document.getElementById("lblImmichDir").innerText = cfg.storage.immich_upload_dir || "/mnt/hdd1/immich/upload/upload";

      document.getElementById("cfgMaxTemp").value = cfg.thermal.max_temp_c || 68;
      document.getElementById("cfgCooldownTemp").value = cfg.thermal.cooldown_temp_c || 60;
      document.getElementById("cfgVideoThreads").value = cfg.compression.video_threads || 1;

      document.getElementById("cfgPhotoQuality").value = cfg.compression.photo_quality || 82;
      document.getElementById("cfgPhotoMaxDim").value = cfg.compression.photo_max_dim || 2560;
      document.getElementById("cfgVideoCRF").value = cfg.compression.video_crf || 26;

      document.getElementById("cfgMaxVideoWorkers").value = cfg.compression.max_video_workers || 1;
      document.getElementById("cfgMaxPhotoWorkers").value = cfg.compression.max_photo_workers || 2;
    })
    .catch(() => {});
}

function saveSettings(e) {
  e.preventDefault();
  const payload = {
    server: {
      port: parseInt(document.getElementById("cfgPort").value),
      new_password: document.getElementById("cfgNewPassword").value || ""
    },
    storage: {
      immich_upload_dir: document.getElementById("cfgImmichDir").value
    },
    thermal: {
      max_temp_c: parseFloat(document.getElementById("cfgMaxTemp").value),
      cooldown_temp_c: parseFloat(document.getElementById("cfgCooldownTemp").value)
    },
    compression: {
      video_threads: parseInt(document.getElementById("cfgVideoThreads").value),
      photo_quality: parseInt(document.getElementById("cfgPhotoQuality").value),
      photo_max_dim: parseInt(document.getElementById("cfgPhotoMaxDim").value),
      video_crf: parseInt(document.getElementById("cfgVideoCRF").value),
      max_video_workers: parseInt(document.getElementById("cfgMaxVideoWorkers").value),
      max_photo_workers: parseInt(document.getElementById("cfgMaxPhotoWorkers").value)
    }
  };

  fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": authPassword
    },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(res => {
      alert("✅ Konfigurasi berhasil disimpan dan dimuat ulang!");
      if (payload.server.new_password) {
        authPassword = payload.server.new_password;
        sessionStorage.setItem("kompic_auth", authPassword);
      }
      loadSettings();
    })
    .catch(err => {
      alert("❌ Gagal menyimpan konfigurasi: " + err);
    });
}

function triggerRescan() {
  fetch("/api/scan", {
    method: "POST",
    headers: { "X-Admin-Password": authPassword }
  }).then(() => {
    alert("⚡ Pindai folder Immich dimulai di latar belakang!");
  });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
