#!/bin/bash
# ============================================================
#  Script cài Miniconda + Java (OpenJDK 17) cho Ubuntu
#  Tự động nhận diện kiến trúc CPU (x86_64, aarch64, armv7l)
#  Tự động chọn đúng bản Miniconda
#  Hỗ trợ cài mới hoặc cập nhật Conda
# ============================================================

set -e

INSTALL_DIR="$HOME/miniconda"
CONDA_SCRIPT="/tmp/miniconda.sh"

echo "============================================================"
echo "     CÀI ĐẶT JAVA + MINICONDA (TƯƠNG THÍCH MỌI KIẾN TRÚC)"
echo "============================================================"
echo ""

# ------------------------------------------------------------
# 1. Nhận diện kiến trúc CPU
# ------------------------------------------------------------
echo "[1/6] Detecting CPU architecture..."
ARCH=$(uname -m)
echo "Detected architecture: $ARCH"

case "$ARCH" in
    x86_64)
        MINICONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
        ;;
    aarch64)
        MINICONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-aarch64.sh"
        ;;
    armv7l)
        MINICONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-armv7l.sh"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# ------------------------------------------------------------
# 2. Update hệ thống + cài Java
# ------------------------------------------------------------
echo "[2/6] Updating hệ thống..."
sudo apt update -y
sudo apt install -y wget curl bzip2

echo "[3/6] Cài đặt OpenJDK 17..."
sudo apt install -y openjdk-17-jdk

echo "Java installed:"
java -version
echo ""

# ------------------------------------------------------------
# 3. Tải Miniconda
# ------------------------------------------------------------
echo "[4/6] Tải Miniconda phù hợp với kiến trúc $ARCH ..."
wget -q "$MINICONDA_URL" -O "$CONDA_SCRIPT"

# ------------------------------------------------------------
# 4. Cài hoặc cập nhật Conda
# ------------------------------------------------------------
echo "[5/6] Cài / Cập nhật Miniconda..."

if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  Conda đã tồn tại tại: $INSTALL_DIR"
    echo "➡️  Tiến hành UPDATE..."
    bash "$CONDA_SCRIPT" -b -u -p "$INSTALL_DIR"
else
    echo "➡️  Cài mới Miniconda..."
    bash "$CONDA_SCRIPT" -b -p "$INSTALL_DIR"
fi

# ------------------------------------------------------------
# 5. Khởi tạo Conda
# ------------------------------------------------------------
echo "[6/6] Thiết lập Conda cho Bash..."
"$INSTALL_DIR/bin/conda" init bash

echo ""
echo "============================================================"
echo "                HOÀN TẤT CÀI ĐẶT!"
echo "============================================================"
echo ""
echo "⚠️  VUI LÒNG CHẠY LỆNH SAU ĐỂ KÍCH HOẠT CONDA:"
echo "    source ~/.bashrc"
echo ""
echo "Sau đó kiểm tra:"
echo "    conda --version"
echo ""
echo "🎉 Conda + Java đã sẵn sàng!"
