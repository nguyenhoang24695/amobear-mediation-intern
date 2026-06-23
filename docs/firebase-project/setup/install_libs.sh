#!/bin/bash
set -e

ENV_NAME="spark_env"
REQ_FILE="requirements.txt"
PYTHON_VERSION="3.10"

echo "=============================================="
echo "     TẠO CONDA ENV + CÀI REQUIREMENTS"
echo "=============================================="

# 1. Load conda
if [ -f "$HOME/miniconda/etc/profile.d/conda.sh" ]; then
    source "$HOME/miniconda/etc/profile.d/conda.sh"
else
    echo "❌ Không tìm thấy conda!"
    exit 1
fi

# 2. Accept Anaconda TOS
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main || true
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r || true

# 3. Xóa env nếu tồn tại
if conda env list | grep -q "$ENV_NAME"; then
    echo "⚠️  Xóa environment cũ: $ENV_NAME"
    conda remove -n "$ENV_NAME" --all -y
fi

# 4. Tạo env mới
echo "➡️  Tạo environment '$ENV_NAME'..."
conda create -n "$ENV_NAME" python=$PYTHON_VERSION -y

# 5. Activate env
source "$HOME/miniconda/etc/profile.d/conda.sh"
conda activate "$ENV_NAME"

# 6. Cài theo requirements.txt — *KHÔNG TRƯỢT VERSION*
echo "➡️  Cài packages từ requirements.txt"
pip install --no-deps -r "$REQ_FILE"
pip install -r "$REQ_FILE"

echo "=============================================="
echo "       HOÀN TẤT TẠO ENV '$ENV_NAME'"
echo "=============================================="
