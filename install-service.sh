#!/bin/bash
set -e

# kompic-next systemd installer & service manager
# Optimized for Amlogic S905X (HG680P / ODROID-C2) running DietPi (ARM64)

SERVICE_NAME="kompic-next"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
APP_DIR="/opt/kompic-next"
BINARY_SOURCE="$(cd "$(dirname "$0")" && pwd)"

if [ "$1" == "--uninstall" ]; then
    echo "Menghapus service ${SERVICE_NAME}..."
    systemctl stop ${SERVICE_NAME} || true
    systemctl disable ${SERVICE_NAME} || true
    rm -f ${SERVICE_FILE}
    systemctl daemon-reload
    echo "✅ Service ${SERVICE_NAME} berhasil dihapus."
    exit 0
fi

echo "=========================================================="
echo "   ⚡ Memasang kompic-next: Immich Optimizer (S905X)"
echo "=========================================================="

# 1. Pasang dependensi runtime sistem
echo "1. Memeriksa dependensi sistem..."
apt-get update -qq
apt-get install -y -qq ffmpeg libimage-exiftool-perl imagemagick libheif-examples

# 2. Siapkan direktori aplikasi di /opt/kompic-next
echo "2. Menyiapkan direktori di ${APP_DIR}..."
mkdir -p ${APP_DIR}/static
mkdir -p ${APP_DIR}/logs

# 3. Pasang Binary Pre-compiled (Zero Compile on STB)
echo "3. Memasang binary pre-compiled kompic-next (ARM64)..."
if [ -f "${BINARY_SOURCE}/kompic-next-linux-arm64" ]; then
    cp "${BINARY_SOURCE}/kompic-next-linux-arm64" "${APP_DIR}/kompic-next"
elif [ -f "${BINARY_SOURCE}/kompic-next" ]; then
    cp "${BINARY_SOURCE}/kompic-next" "${APP_DIR}/kompic-next"
elif command -v go >/dev/null 2>&1; then
    echo "Binary pre-compiled tidak ditemukan, mengompilasi lokal..."
    go build -ldflags="-s -w" -o "${APP_DIR}/kompic-next" "${BINARY_SOURCE}/main.go"
else
    echo "❌ Binary kompic-next-linux-arm64 tidak ditemukan!"
    exit 1
fi
chmod +x "${APP_DIR}/kompic-next"

# 4. Salin file statis UI dan konfigurasi jika berbeda folder
if [ "${BINARY_SOURCE}" != "${APP_DIR}" ]; then
    cp -r "${BINARY_SOURCE}/static"/* "${APP_DIR}/static/"
    if [ ! -f "${APP_DIR}/config.json" ]; then
        cp "${BINARY_SOURCE}/config.json" "${APP_DIR}/config.json"
    fi
else
    # Jika dijalankan langsung dari dalam /opt/kompic-next
    if [ ! -f "${APP_DIR}/config.json" ] && [ -f "${BINARY_SOURCE}/config.json" ]; then
        cp "${BINARY_SOURCE}/config.json" "${APP_DIR}/config.json"
    fi
fi

# 5. Pasang Systemd Unit
echo "4. Memasang unit service di ${SERVICE_FILE}..."
cat <<EOF > ${SERVICE_FILE}
[Unit]
Description=kompic-next Immich Media Optimizer (S905X)
After=network.target immich.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=${APP_DIR}/kompic-next
Restart=always
RestartSec=5
Nice=15
IOSchedulingClass=idle
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 6. Aktifkan dan jalankan service
echo "5. Mengaktifkan dan me-restart service..."
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

echo ""
echo "=========================================================="
echo "✅ kompic-next BERHASIL DIPASANG DAN DIAKTIFKAN!"
echo "=========================================================="
echo "🌐 Akses Web UI: http://$(hostname -I | awk '{print $1}'):3333"
echo "🔑 Password Default: admin"
echo "📊 Status Service: sudo systemctl status ${SERVICE_NAME}"
echo "📝 Pantau Log: sudo journalctl -u ${SERVICE_NAME} -f"
echo "=========================================================="
