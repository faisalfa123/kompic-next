#!/bin/bash
set -e

# kompic-next systemd installer & service manager
# Optimized for Amlogic S905X (HG680P / ODROID-C2) running DietPi (ARM64)

SERVICE_NAME="kompic-next"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
APP_DIR="/opt/kompic-next"

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

# 1. Pasang dependensi jika belum ada
echo "Memeriksa paket dependensi..."
apt-get update -qq
apt-get install -y -qq ffmpeg libimage-exiftool-perl imagemagick libheif-examples golang-go

# 2. Buat direktori aplikasi di /opt/kompic-next
echo "Menyiapkan direktori di ${APP_DIR}..."
mkdir -p ${APP_DIR}/static
mkdir -p ${APP_DIR}/logs

# 3. Kompilasi binary Go lokal
echo "Mengompilasi binary kompic-next (Go)..."
cd "$(dirname "$0")"
go build -ldflags="-s -w" -o ${APP_DIR}/kompic-next main.go

# 4. Salin file statis dan config
cp -r static/* ${APP_DIR}/static/
if [ ! -f "${APP_DIR}/config.json" ]; then
    cp config.json ${APP_DIR}/config.json
fi

# 5. Pasang Systemd Unit
echo "Membuat service systemd di ${SERVICE_FILE}..."
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

# 6. Aktifkan service
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
