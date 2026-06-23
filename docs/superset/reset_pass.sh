#!/bin/bash
# Lưu ý cấp quyền cho file bằng lệnh: chmod +x reset_pass.sh
# Script đổi mật khẩu Superset nhanh
if [ "$#" -ne 2 ]; then
    echo "Cách dùng: ./reset_pass.sh <email_user> <mật_khẩu_mới>"
    exit 1
fi

docker exec amobearmediationtools-superset-1 superset fab reset-password --username "$1" --password "$2"
echo "Đã đổi mật khẩu thành công cho user: $1"