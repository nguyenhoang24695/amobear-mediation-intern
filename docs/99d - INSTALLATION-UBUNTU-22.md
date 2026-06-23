# Hướng Dẫn Cài Đặt Mediation Pro trên Ubuntu 22 LTS

Tài liệu này hướng dẫn cài đặt và vận hành hệ thống **Mediation Pro** trên Ubuntu 22.04 LTS.

## 📋 Mục Lục

1. [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
2. [Cài Đặt Dependencies](#cài-đặt-dependencies)
3. [Cài Đặt Docker & Docker Compose](#cài-đặt-docker--docker-compose)
4. [Cấu Hình Services](#cấu-hình-services)
5. [Setup Backend](#setup-backend)
6. [Setup Frontend](#setup-frontend)
7. [Chạy Migrations](#chạy-migrations)
8. [Khởi Động Ứng Dụng](#khởi-động-ứng-dụng)
9. [Kiểm Tra & Troubleshooting](#kiểm-tra--troubleshooting)

---

## 🖥️ Yêu Cầu Hệ Thống

### Phần Cứng Tối Thiểu
- **CPU**: 2 cores trở lên
- **RAM**: 4GB trở lên (khuyến nghị 8GB+)
- **Disk**: 20GB trống trở lên
- **OS**: Ubuntu 22.04 LTS

### Phần Mềm Cần Thiết
- **.NET 8.0 SDK**
- **Node.js 18+** và **pnpm**
- **Docker** và **Docker Compose**
- **Git**
- **PostgreSQL Client** (optional, để kiểm tra database)

---

## 🔧 Cài Đặt Dependencies

### 1. Cập Nhật Hệ Thống

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Cài Đặt Công Cụ Cơ Bản

```bash
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release
```

### 3. Cài Đặt .NET 8.0 SDK

```bash
# Thêm Microsoft package repository
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# Cài đặt .NET 8.0 SDK
sudo apt update
sudo apt install -y dotnet-sdk-8.0

# Kiểm tra cài đặt
dotnet --version
# Kết quả mong đợi: 8.0.x
```

### 4. Cài Đặt Node.js 18+ và pnpm

```bash
# Cài đặt Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra cài đặt
node --version
npm --version
# Kết quả mong đợi: Node.js v18.x.x hoặc cao hơn
```

#### Cài Đặt pnpm (Nhiều Phương Pháp)

**Phương pháp 1: Sử dụng npm (Khuyến nghị)**

```bash
# Cài đặt pnpm global
sudo npm install -g pnpm

# Kiểm tra cài đặt
pnpm --version
# Kết quả mong đợi: 9.x.x hoặc cao hơn
```

**Phương pháp 2: Sử dụng Corepack (Built-in với Node.js 16.13+)**

```bash
# Kích hoạt Corepack
sudo corepack enable

# Cài đặt pnpm qua Corepack
sudo corepack prepare pnpm@latest --activate

# Kiểm tra cài đặt
pnpm --version
```

**Phương pháp 3: Sử dụng standalone script**

```bash
# Tải và cài đặt pnpm standalone
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Reload shell configuration
source ~/.bashrc
# Hoặc nếu dùng zsh:
# source ~/.zshrc

# Kiểm tra cài đặt
pnpm --version
```

**Phương pháp 4: Sử dụng npm với quyền user (không cần sudo)**

```bash
# Tạo thư mục global cho npm packages (nếu chưa có)
mkdir -p ~/.npm-global

# Cấu hình npm để sử dụng thư mục này
npm config set prefix '~/.npm-global'

# Thêm vào PATH (thêm vào ~/.bashrc hoặc ~/.zshrc)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Cài đặt pnpm
npm install -g pnpm

# Kiểm tra cài đặt
pnpm --version
```

**Lưu ý**: Nếu gặp lỗi permission khi cài đặt, hãy thử phương pháp 4 hoặc sử dụng `sudo`.

### 5. Cài Đặt PostgreSQL Client (Optional)

```bash
sudo apt install -y postgresql-client
```

---

## 🐳 Cài Đặt Docker & Docker Compose

### 1. Cài Đặt Docker

```bash
# Thêm Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Thêm Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Thêm user hiện tại vào docker group (để chạy docker không cần sudo)
sudo usermod -aG docker $USER

# Khởi động Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Kiểm tra cài đặt
docker --version
docker compose version

# Logout và login lại để áp dụng thay đổi group, hoặc chạy:
newgrp docker
```

### 2. Kiểm Tra Docker

```bash
# Test Docker
docker run hello-world
```

---

## 🗄️ Cấu Hình Services

### 1. Tạo User `amobear` và Phân Quyền

**Lưu ý**: Nếu bạn muốn dùng `root` thay vì tạo user riêng, hãy bỏ qua bước này và thay `User=amobear` thành `User=root` trong các service files.

```bash
# Tạo user amobear (nếu chưa có)
# Option 1: User có thể login (nếu cần SSH vào)
sudo useradd -m -s /bin/bash amobear

# Option 2: User không có login shell (an toàn hơn, khuyến nghị)
# sudo useradd -m -s /usr/sbin/nologin amobear

# Tạo thư mục home nếu chưa có
sudo mkdir -p /home/amobear

# Đảm bảo user amobear sở hữu toàn bộ thư mục home
sudo chown -R amobear:amobear /home/amobear

# Tạo thư mục .dotnet cho .NET cache (quan trọng!)
sudo mkdir -p /home/amobear/.dotnet
sudo chown -R amobear:amobear /home/amobear/.dotnet
sudo chmod 755 /home/amobear/.dotnet

# Tạo thư mục .npm cho npm cache (nếu cần)
sudo mkdir -p /home/amobear/.npm
sudo chown -R amobear:amobear /home/amobear/.npm

# Tạo thư mục NuGet cho dotnet restore/build (quan trọng!)
sudo mkdir -p /home/amobear/.nuget/NuGet
sudo mkdir -p /home/amobear/.config/NuGet
sudo chown -R amobear:amobear /home/amobear/.nuget
sudo chown -R amobear:amobear /home/amobear/.config

# Kiểm tra quyền
ls -la /home/amobear
```

### 2. Clone Repository (Production path: `/home/amobear/Amobear.Mediation.Tools`)

```bash
# Chuyển sang user amobear (hoặc dùng sudo -u amobear)
sudo -u amobear bash

# Hoặc nếu đang login với user khác, clone với quyền amobear
cd /home/amobear

# Clone repository (thay đổi URL nếu cần)
sudo -u amobear git clone <repository-url> Amobear.Mediation.Tools

# Đảm bảo user amobear sở hữu toàn bộ project
sudo chown -R amobear:amobear /home/amobear/Amobear.Mediation.Tools

# Di chuyển vào thư mục project
cd /home/amobear/Amobear.Mediation.Tools
```

### 2. Khởi Động Docker Services

Các service **postgres-init** và **superset** dùng image build sẵn (script init nằm trong image, không mount thư mục host). StarRocks dùng mount trực tiếp file `fe.conf`/`be.conf`, không dùng starrocks-init. Lần đầu chạy nên build luôn:

```bash
# Build image và khởi động tất cả services (PostgreSQL, postgres-init, Redis, RabbitMQ, MinIO, StarRocks, Superset)
docker compose up -d --build

# Các lần sau chỉ cần:
# docker compose up -d

# Kiểm tra trạng thái các containers
docker compose ps

# Xem logs nếu cần
docker compose logs -f
```

Các services sẽ chạy trên các ports sau:
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **RabbitMQ**: `localhost:5672` (AMQP), `localhost:15672` (Management UI)
- **MinIO**: `localhost:9000` (API), `localhost:9001` (Console UI) — Data Lake raw JSON (AdMob, Firebase)
- **StarRocks**: `localhost:9030` (MySQL protocol), `localhost:8030` (FE HTTP — Stream Load), `localhost:8040` (BE HTTP)
- **Superset**: `http://localhost:8088` (BI / Dashboard)

### 5. Tạo Thư Mục Logs Chung Cho Toàn Hệ Thống

Toàn bộ logs sẽ nằm trong thư mục `logs` **cùng cấp** với `backend` và `frontend`:

```bash
cd /home/amobear/Amobear.Mediation.Tools

# Tạo thư mục logs gốc cho toàn hệ thống
mkdir -p logs/backend-api
mkdir -p logs/frontend

# Phân quyền cho user chạy services (ví dụ: amobear)
sudo chown -R amobear:amobear logs
```

### 3. Kiểm Tra Kết Nối Database

```bash
# Kiểm tra PostgreSQL
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "SELECT version();"

# Kiểm tra Redis
docker exec -it mediationpro-redis redis-cli ping
# Kết quả mong đợi: PONG

# Kiểm tra MinIO (API)
curl -s http://localhost:9000/minio/health/live || echo "MinIO may not expose health on 9000"

# Kiểm tra RabbitMQ
curl -u mediationpro:mediationpro123 http://localhost:15672/api/overview

# Kiểm tra StarRocks (MySQL protocol)
docker exec -it mediationpro-starrocks mysql -h 127.0.0.1 -P 9030 -u root -e "SHOW DATABASES;"

# Kiểm tra Superset
curl -s http://localhost:8088/health
```

### 4. Database do postgres-init tạo (Không cần tạo thủ công)

Khi chạy `docker compose up -d`, service **postgres-init** sẽ tự chạy sau khi PostgreSQL healthy và tạo sẵn:

- Database `mediationpro_hangfire` (cho Hangfire)
- Database `mediation_portal`
- User `superset` và database `superset` (cho Superset)

**Không cần** chạy lệnh `CREATE DATABASE` thủ công. Chỉ cần chạy migration cho ứng dụng (xem mục [Chạy Migrations](#5-chạy-migrations)).

---

## 🔨 Setup Backend

### 1. Di Chuyển Đến Thư Mục Backend (Production)

```bash
cd /home/amobear/Amobear.Mediation.Tools/backend
```

### 2. Restore NuGet Packages

```bash
dotnet restore
```

### 3. Build Solution

```bash
dotnet build
```

### 4. Cấu Hình appsettings.json

Chỉnh sửa file `MediationPro.Api/appsettings.json` nếu cần thay đổi connection strings hoặc cấu hình:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=mediationpro;Username=mediationpro;Password=mediationpro123;Pooling=true;MinPoolSize=5;MaxPoolSize=20",
    "HangfireConnection": "Host=localhost;Port=5432;Database=mediationpro_hangfire;Username=mediationpro;Password=mediationpro123;Pooling=true;MinPoolSize=2;MaxPoolSize=10",
    "Redis": "localhost:6379",
    "RabbitMQ": "amqp://mediationpro:mediationpro123@localhost:5672/"
  },
  "MinIO": {
    "Endpoint": "localhost:9000",
    "AccessKey": "mediationpro",
    "SecretKey": "mediationpro123",
    "UseSSL": false
  },
  "StarRocks": {
    "ConnectionString": "Server=localhost;Port=9030;Uid=root;Pwd=;Database=bronze",
    "HttpHost": "localhost",
    "HttpPort": 8030
  },
  "AdMob": {
    "ClientId": "YOUR_CLIENT_ID",
    "ClientSecret": "YOUR_CLIENT_SECRET",
    "DefaultAccountId": "default"
  }
}
```

**Lưu ý**:
- Cập nhật `AdMob.ClientId` và `AdMob.ClientSecret` với thông tin thực tế của bạn.
- **StarRocks**: Nếu dùng sync AdMob/AppLovin lên StarRocks, cấu hình `StarRocks.ConnectionString` (port 9030), `HttpHost` và `HttpPort` (8030 cho Stream Load). Superset kết nối StarRocks qua URI: `starrocks://root:@localhost:9030/bronze`.
- **Với service đã cấu hình**: Khi sửa `appsettings.json` hoặc `appsettings.Production.json`, chỉ cần restart service. Service sẽ tự động rebuild và áp dụng thay đổi:
  ```bash
  sudo systemctl restart mediationpro-api
  ```

**Đường dẫn logs backend (Serilog):**

- Tất cả logs backend API sẽ được ghi vào:
  - Root: `logs/backend-api` (cùng cấp với `backend` và `frontend`)
  - Cấu trúc thư mục: `logs/backend-api/yyyy/MM/dd/`
  - Tên file: `mediationpro-api-*.log`

### 5. Chạy Migrations

```bash
# Chạy migrations để tạo database schema
dotnet ef database update --project MediationPro.Infrastructure --startup-project MediationPro.Api
```

### 6. Chạy Backend (Production)

```bash
# Di chuyển vào thư mục API
cd /home/amobear/Amobear.Mediation.Tools/backend/MediationPro.Api

# Chạy backend ở môi trường Production
ASPNETCORE_ENVIRONMENT=Production dotnet run
```

Backend sẽ chạy trên:
- **HTTP**: `http://0.0.0.0:5000` (truy cập được qua `localhost`, `127.0.0.1` và IP private như `10.x.x.x`)

Nếu chỉ chạy thử trong môi trường development (local), có thể dùng:

```bash
cd /home/amobear/Amobear.Mediation.Tools/backend/MediationPro.Api
dotnet watch run
```

**Lưu ý**: Cấu hình Kestrel trong code đã được chỉnh để:
- Development: chỉ bind localhost (an toàn cho dev)
- Production (`ASPNETCORE_ENVIRONMENT=Production`): bind `0.0.0.0:5000` để nhận request từ IP private / Docker network.

---

## 🎨 Setup Frontend

### 1. Di Chuyển Đến Thư Mục Frontend (Production)

```bash
cd /home/amobear/Amobear.Mediation.Tools/frontend
```

### 2. Kiểm Tra pnpm Đã Được Cài Đặt

```bash
# Kiểm tra pnpm
pnpm --version

# Nếu gặp lỗi "command not found", cài đặt pnpm:
# Phương pháp 1: Sử dụng npm
sudo npm install -g pnpm

# Phương pháp 2: Sử dụng Corepack
sudo corepack enable
sudo corepack prepare pnpm@latest --activate

# Phương pháp 3: Standalone script
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Sau khi cài đặt, kiểm tra lại
pnpm --version
```

### 3. Cài Đặt Dependencies

```bash
# Cài đặt dependencies với pnpm
pnpm install

# Nếu pnpm không hoạt động, có thể dùng npm thay thế:
# npm install
```

**Lưu ý**: Quá trình cài đặt có thể mất vài phút tùy thuộc vào tốc độ internet.

### 3. Tạo File .env.local

Tạo file `.env.local` trong thư mục `frontend/`:

```bash
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
# Hoặc nếu dùng HTTPS:
# NEXT_PUBLIC_API_URL=https://localhost:5001
EOF
```

### 4. Build Frontend (Optional, cho production)

```bash
# Build cho production
pnpm build
```

### 5. Chạy Frontend

#### Development (local)

```bash
cd /home/amobear/Amobear.Mediation.Tools/frontend
pnpm dev
```

Frontend sẽ chạy trên: `http://localhost:3000`

#### Production

```bash
cd /home/amobear/Amobear.Mediation.Tools/frontend
pnpm build
NODE_ENV=production NEXT_PUBLIC_API_URL=http://localhost:5000 pnpm start
```

Với cấu hình `package.json` hiện tại:
- `pnpm dev` → `next dev -H 0.0.0.0 -p 3000`
- `pnpm start` → `next start -H 0.0.0.0 -p 3000`

Nên frontend sẽ bind `0.0.0.0:3000` (truy cập được qua localhost, 127.0.0.1 và IP private).

---

## 🚀 Khởi Động Ứng Dụng

### Cách 1: Chạy Thủ Công (Production đơn giản)

**Terminal 1 - Backend (Production):**
```bash
cd /home/amobear/Amobear.Mediation.Tools/backend/MediationPro.Api
ASPNETCORE_ENVIRONMENT=Production dotnet run
```

**Terminal 2 - Frontend (Production):**
```bash
cd /home/amobear/Amobear.Mediation.Tools/frontend
pnpm build
NODE_ENV=production NEXT_PUBLIC_API_URL=http://localhost:5000 pnpm start
```

### Cách 2: Chạy Với systemd (Production khuyến nghị)

#### Tạo Service cho Backend

```bash
sudo nano /etc/systemd/system/mediationpro-api.service
```

Thêm nội dung sau (thay đổi đường dẫn phù hợp):

```ini
[Unit]
Description=Mediation Pro API
After=network.target postgresql.service

[Service]
# Type=simple: Service chạy trong foreground, systemd sẽ theo dõi process chính
# Không dùng Type=notify vì ASP.NET Core không tự động notify systemd
Type=simple
User=amobear
Group=amobear
WorkingDirectory=/home/amobear/Amobear.Mediation.Tools/backend/MediationPro.Api
# Tạo thư mục .dotnet trước khi start (nếu chưa có)
ExecStartPre=/bin/bash -c "mkdir -p /home/amobear/.dotnet && chmod 755 /home/amobear/.dotnet"
# Sử dụng wrapper script để có logging tốt hơn
ExecStart=/home/amobear/Amobear.Mediation.Tools/scripts/start-backend.sh
# Thông báo khi service đã start (sau 5 giây để server có thời gian khởi động)
ExecStartPost=/bin/bash -c "sleep 5 && echo '✅ Backend service started. Check logs: sudo journalctl -u mediationpro-api -f' >> ../../logs/backend-api/backend-console.out.log"
# Cho phép thời gian khởi động lâu hơn (các job có thể mất thời gian)
TimeoutStartSec=300
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=mediationpro-api
# Biến môi trường quan trọng
# QUAN TRỌNG: Set Production environment, Kestrel sẽ tự bind 0.0.0.0:5000 trong chế độ Production
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=HOME=/home/amobear
Environment=DOTNET_ROOT=/usr/share/dotnet
# Đảm bảo .NET có quyền truy cập vào cache directory
Environment=DOTNET_CLI_HOME=/home/amobear/.dotnet
# CORS: Cấu hình allowed origins cho frontend (comma-separated)
# Ví dụ: http://your-domain.com,https://your-domain.com,http://10.0.0.100:3000
# Nếu không set, sẽ dùng giá trị từ appsettings.Production.json
# Environment=CORS_ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com
StandardOutput=append:../../logs/backend-api/backend-console.out.log
StandardError=append:../../logs/backend-api/backend-console.err.log

[Install]
WantedBy=multi-user.target
```

**Bước 1: Tạo wrapper script cho backend (nếu chưa có)**

```bash
sudo nano /home/amobear/Amobear.Mediation.Tools/scripts/start-backend.sh
```

Copy nội dung từ file `scripts/start-backend.sh` trong repository, hoặc tạo theo hướng dẫn trong tài liệu.

Cấp quyền thực thi:

```bash
sudo chmod +x /home/amobear/Amobear.Mediation.Tools/scripts/start-backend.sh
sudo chown amobear:amobear /home/amobear/Amobear.Mediation.Tools/scripts/start-backend.sh
```

**✨ Tính năng của wrapper script:**

- **Tự động rebuild**: Script sẽ tự động rebuild khi `appsettings.json` hoặc `appsettings.Production.json` thay đổi
- **Thông minh**: Chỉ rebuild khi cần (khi config files mới hơn DLL hoặc chưa có DLL)
- **Logging tốt**: Hiển thị thông tin chi tiết khi build và start
- **An toàn**: Nếu build fail, service sẽ không start

**Bước 2: Kích hoạt và khởi động service**

**QUAN TRỌNG:** Service file sử dụng `Type=simple` và chạy với DLL đã build sẵn. Bạn PHẢI build project trước khi start service.

```bash
# 1. Đảm bảo thư mục logs và .dotnet có quyền đúng
sudo chown -R amobear:amobear /home/amobear/Amobear.Mediation.Tools/logs
sudo mkdir -p /home/amobear/.dotnet
sudo chown -R amobear:amobear /home/amobear/.dotnet
sudo chmod 755 /home/amobear/.dotnet

# 2. Đảm bảo thư mục NuGet có quyền đúng (quan trọng cho dotnet restore/build)
sudo mkdir -p /home/amobear/.nuget/NuGet
sudo mkdir -p /home/amobear/.config/NuGet
sudo chown -R amobear:amobear /home/amobear/.nuget
sudo chown -R amobear:amobear /home/amobear/.config

# 3. Build project trước (BẮT BUỘC - service sẽ không chạy được nếu chưa build!)
cd /home/amobear/Amobear.Mediation.Tools/backend
sudo -u amobear dotnet restore
sudo -u amobear dotnet build -c Release

# 4. Kiểm tra DLL đã được build thành công
ls -lh /home/amobear/Amobear.Mediation.Tools/backend/MediationPro.Api/bin/Release/net8.0/MediationPro.Api.dll

# 5. Reload systemd và khởi động service
sudo systemctl daemon-reload
sudo systemctl enable mediationpro-api
sudo systemctl start mediationpro-api

# 5. Kiểm tra trạng thái
sudo systemctl status mediationpro-api

# 6. Xem logs real-time để thấy thông tin start (QUAN TRỌNG)
# Mở terminal mới và chạy:
sudo journalctl -u mediationpro-api -f

# Hoặc xem logs gần nhất:
sudo journalctl -u mediationpro-api -n 50 --no-pager

# 7. Kiểm tra port đã bind đúng chưa
sudo netstat -tunpl | grep 5000
# Kết quả mong đợi: tcp    0    0    0.0.0.0:5000    0.0.0.0:*    LISTEN

# Nếu gặp lỗi permission, kiểm tra lại quyền:
sudo chown -R amobear:amobear /home/amobear
```

#### Cấu hình CORS cho Production

**QUAN TRỌNG:** Backend cần được cấu hình để cho phép frontend từ domain/IP production truy cập.

**Cách 1: Cấu hình qua Environment Variable (Khuyến nghị)**

Sửa file service `/etc/systemd/system/mediationpro-api.service` và thêm dòng:

```ini
Environment=CORS_ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com,http://10.0.0.100:3000
```

Ví dụ:
- Nếu frontend chạy trên domain: `http://mediationpro.example.com,https://mediationpro.example.com`
- Nếu frontend chạy trên IP: `http://10.0.0.100:3000,http://192.168.1.100:3000`
- Nếu có cả domain và IP: `http://mediationpro.example.com,https://mediationpro.example.com,http://10.0.0.100:3000`

Sau đó reload và restart service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart mediationpro-api
```

**Cách 2: Cấu hình qua appsettings.Production.json**

Sửa file `/home/amobear/Amobear.Mediation.Tools/backend/MediationPro.Api/appsettings.Production.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://your-domain.com",
      "https://your-domain.com",
      "http://10.0.0.100:3000"
    ]
  }
}
```

Sau đó restart service:

```bash
sudo systemctl restart mediationpro-api
```

**Kiểm tra CORS đã được cấu hình đúng:**

Xem log để kiểm tra allowed origins:

```bash
sudo journalctl -u mediationpro-api | grep "CORS Allowed Origins"
```

Kết quả mong đợi:
```
[INF] CORS Allowed Origins: http://your-domain.com, https://your-domain.com, http://10.0.0.100:3000
```

**Lưu ý:**
- Nếu frontend dùng HTTPS, phải thêm cả `http://` và `https://` vào allowed origins
- Nếu frontend chạy trên port khác 3000, nhớ thêm port vào URL
- Sau khi sửa CORS, phải restart service để áp dụng thay đổi

#### Tạo Service cho Frontend

**Bước 1: Tạo wrapper script để tự động build và start**

```bash
sudo nano /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh
```

Thêm nội dung sau:

```bash
#!/bin/bash
# Wrapper script để tự động build (nếu cần) và start frontend
# Script này sẽ được gọi bởi systemd service

set -e

FRONTEND_DIR="/home/amobear/Amobear.Mediation.Tools/frontend"
ENV_FILE="$FRONTEND_DIR/.env.local"
BUILD_DIR="$FRONTEND_DIR/.next"
BUILD_MARKER="$BUILD_DIR/BUILD_ID"

# Đảm bảo đang ở đúng thư mục
cd "$FRONTEND_DIR" || {
    echo "❌ Error: Cannot change to directory $FRONTEND_DIR"
    exit 1
}

# Kiểm tra pnpm có sẵn không
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm command not found"
    echo "💡 Try: npm install -g pnpm"
    exit 1
fi

# Kiểm tra xem có cần build không
NEED_BUILD=false

# Nếu chưa có build directory hoặc BUILD_ID, cần build
if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_MARKER" ]; then
    echo "📦 Build directory not found or incomplete, building..."
    NEED_BUILD=true
# Nếu .env.local mới hơn build, cần rebuild
elif [ -f "$ENV_FILE" ] && [ -d "$BUILD_DIR" ]; then
    ENV_TIME=$(stat -c %Y "$ENV_FILE" 2>/dev/null || echo 0)
    BUILD_TIME=$(stat -c %Y "$BUILD_DIR" 2>/dev/null || echo 0)
    
    if [ "$ENV_TIME" -gt "$BUILD_TIME" ]; then
        echo "🔄 .env.local is newer than build, rebuilding..."
        NEED_BUILD=true
    fi
fi

# Build nếu cần
if [ "$NEED_BUILD" = true ]; then
    echo "🔨 Building frontend..."
    echo "📁 Working directory: $(pwd)"
    echo "🔧 pnpm version: $(pnpm --version)"
    
    # Xóa build cũ nếu có
    if [ -d "$BUILD_DIR" ]; then
        echo "🧹 Cleaning old build..."
        rm -rf "$BUILD_DIR"
    fi
    
    # Build
    pnpm build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed! Check the error messages above."
        exit 1
    fi
    
    # Kiểm tra build đã thành công chưa
    if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/BUILD_ID" ]; then
        echo "❌ Build directory not created properly!"
        exit 1
    fi
    
    echo "✅ Build successful!"
fi

# Kiểm tra lại build directory trước khi start
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: Build directory still not found after build attempt!"
    echo "💡 Try running 'pnpm build' manually to see the error"
    exit 1
fi

# Start Next.js production server
echo "🚀 Starting Next.js production server..."
echo "📁 Build directory: $BUILD_DIR"
exec pnpm start
```

Cấp quyền thực thi:

```bash
sudo chmod +x /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh
sudo chown amobear:amobear /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh
```

**Bước 2: Tạo systemd service file**

```bash
sudo nano /etc/systemd/system/mediationpro-frontend.service
```

Thêm nội dung sau:

```ini
[Unit]
Description=Mediation Pro Frontend
After=network.target

[Service]
Type=simple
User=amobear
Group=amobear
WorkingDirectory=/home/amobear/Amobear.Mediation.Tools/frontend
# Sử dụng wrapper script để tự động build (nếu cần) trước khi start
ExecStart=/home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh
# Thông báo khi service đã start (sau 5 giây để server có thời gian khởi động)
ExecStartPost=/bin/bash -c "sleep 5 && echo '✅ Frontend service started. Check logs: sudo journalctl -u mediationpro-frontend -f' >> ../logs/frontend/frontend.out.log"
Restart=always
RestartSec=10
# Biến môi trường quan trọng
# LƯU Ý: NEXT_PUBLIC_* variables được embed vào code khi build
# Service sẽ tự động rebuild khi .env.local thay đổi
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=http://localhost:5000
Environment=HOME=/home/amobear
StandardOutput=append:../logs/frontend/frontend.out.log
StandardError=append:../logs/frontend/frontend.err.log

[Install]
WantedBy=multi-user.target
```

**Kích hoạt và khởi động service:**

```bash
# 1. Đảm bảo thư mục logs có quyền đúng
sudo chown -R amobear:amobear /home/amobear/Amobear.Mediation.Tools/logs

# 2. Đảm bảo script có quyền thực thi
sudo chmod +x /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh
sudo chown amobear:amobear /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh

# 3. Reload systemd và khởi động service
sudo systemctl daemon-reload
sudo systemctl enable mediationpro-frontend
sudo systemctl start mediationpro-frontend

# 4. Kiểm tra trạng thái
sudo systemctl status mediationpro-frontend

# 5. Xem logs real-time để thấy thông tin start (QUAN TRỌNG)
# Mở terminal mới và chạy:
sudo journalctl -u mediationpro-frontend -f

# Hoặc xem logs gần nhất:
sudo journalctl -u mediationpro-frontend -n 50 --no-pager

# 6. Kiểm tra port đã bind đúng chưa
sudo netstat -tunpl | grep 3000
# Kết quả mong đợi: tcp    0    0    0.0.0.0:3000    0.0.0.0:*    LISTEN

# 7. Nếu gặp lỗi permission, kiểm tra lại quyền:
sudo chown -R amobear:amobear /home/amobear
```

**✨ Ưu điểm của cách này:**

- **Tự động rebuild**: Service sẽ tự động rebuild khi `.env.local` thay đổi
- **Thông minh**: Chỉ rebuild khi cần (khi `.env.local` mới hơn build hoặc chưa có build)
- **Đơn giản**: Chỉ cần restart service sau khi sửa `.env.local`, không cần chạy script riêng
- **An toàn**: Nếu build fail, service sẽ không start
- **Logging tốt**: Script sẽ hiển thị thông tin chi tiết khi start

**📋 Cách xem logs khi start service:**

Khi start service, để thấy thông tin chi tiết, mở terminal mới và chạy:

```bash
# Xem logs real-time của frontend
sudo journalctl -u mediationpro-frontend -f

# Hoặc xem logs real-time của backend
sudo journalctl -u mediationpro-api -f

# Xem logs gần nhất (50 dòng)
sudo journalctl -u mediationpro-frontend -n 50 --no-pager
sudo journalctl -u mediationpro-api -n 50 --no-pager
```

Bạn sẽ thấy các thông tin như:
- ✅ Build status
- 🚀 Server starting
- 🌐 Server URL
- 📊 Process information

**⚠️ QUAN TRỌNG: Về Environment Variables trong Next.js**

Next.js có 2 loại biến môi trường:

1. **Build-time variables** (prefix `NEXT_PUBLIC_*`):
   - Được embed vào JavaScript bundle khi build
   - Chỉ thay đổi khi rebuild (`pnpm build`)
   - **Với service đã cấu hình**: Service sẽ tự động rebuild khi `.env.local` thay đổi

2. **Runtime variables** (không có prefix `NEXT_PUBLIC_*`):
   - Chỉ dùng được ở server-side (API routes, getServerSideProps)
   - Không thể dùng ở client-side

**Khi sửa file `.env.local` hoặc environment variables:**

Với service đã được cấu hình với wrapper script, bạn chỉ cần:

```bash
# 1. Sửa file .env.local
cd /home/amobear/Amobear.Mediation.Tools/frontend
sudo -u amobear nano .env.local

# 2. Restart service (service sẽ tự động rebuild nếu .env.local mới hơn build)
sudo systemctl restart mediationpro-frontend

# 3. Kiểm tra logs để xác nhận rebuild
sudo journalctl -u mediationpro-frontend -f
```

Service sẽ tự động:
- Phát hiện khi `.env.local` mới hơn build
- Tự động rebuild trước khi start
- Start Next.js production server

**Lưu ý**: Lần đầu tiên start service, nó sẽ tự động build nếu chưa có build directory.

**Script helper để rebuild và restart (Optional - Không cần nếu đã dùng wrapper script):**

Nếu bạn muốn có script riêng để rebuild thủ công (không dùng wrapper script trong service), tạo script `/home/amobear/Amobear.Mediation.Tools/scripts/rebuild-frontend.sh`:

```bash
#!/bin/bash
# Script để rebuild và restart frontend service
# LƯU Ý: Không cần thiết nếu service đã dùng wrapper script start-frontend-with-build.sh

cd /home/amobear/Amobear.Mediation.Tools/frontend

echo "🛑 Stopping frontend service..."
sudo systemctl stop mediationpro-frontend

echo "🔨 Building frontend..."
sudo -u amobear pnpm build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Starting frontend service..."
    sudo systemctl start mediationpro-frontend
    echo "📊 Service status:"
    sudo systemctl status mediationpro-frontend --no-pager
else
    echo "❌ Build failed! Service not restarted."
    exit 1
fi
```

Cấp quyền thực thi:

```bash
chmod +x /home/amobear/Amobear.Mediation.Tools/scripts/rebuild-frontend.sh
```

Sử dụng:

```bash
sudo /home/amobear/Amobear.Mediation.Tools/scripts/rebuild-frontend.sh
```

**Lưu ý**: Nếu service đã được cấu hình với wrapper script `start-frontend-with-build.sh`, bạn chỉ cần restart service (`sudo systemctl restart mediationpro-frontend`), không cần chạy script này.

---

## ✅ Kiểm Tra & Troubleshooting

### 1. Kiểm Tra Services

```bash
# Kiểm tra Docker containers
docker compose ps

# Kiểm tra logs
docker compose logs postgres
docker compose logs redis
docker compose logs rabbitmq
docker compose logs starrocks
docker compose logs superset
```

### 2. Kiểm Tra Ports

```bash
# Kiểm tra ports đang được sử dụng (API 5000, Frontend 3000, Postgres 5432, Redis 6379, RabbitMQ 5672/15672, StarRocks 9030/8030, Superset 8088)
sudo netstat -tulpn | grep -E ':(3000|5000|5001|5432|6379|5672|15672|9030|8030|8088)'

# Hoặc dùng ss
sudo ss -tulpn | grep -E ':(3000|5000|5001|5432|6379|5672|15672|9030|8030|8088)'
```

### 3. Kiểm Tra Database Connection

```bash
# Test PostgreSQL connection
psql -h localhost -U mediationpro -d mediationpro -c "SELECT 1;"

# Test Redis connection
redis-cli -h localhost -p 6379 ping
```

### 4. Kiểm Tra Backend API

```bash
# Test API health endpoint (nếu có)
curl http://localhost:5000/api/health

# Test Swagger
curl http://localhost:5000/swagger
```

### 5. Kiểm Tra Frontend

```bash
# Test frontend
curl http://localhost:3000
```

### 6. Xem Logs

**Backend logs:**
```bash
# Nếu chạy với dotnet run
tail -f backend/MediationPro.Api/logs/yyyy/MM/dd/mediationpro-*.log

# Nếu chạy với systemd
sudo journalctl -u mediationpro-api -f
```

**Frontend logs:**
```bash
# Xem logs trong terminal nơi chạy pnpm dev
# Hoặc nếu chạy với systemd
sudo journalctl -u mediationpro-frontend -f
```

### 7. Troubleshooting Các Lỗi Thường Gặp

#### Lỗi: Port đã được sử dụng

```bash
# Tìm process đang sử dụng port
sudo lsof -i :5000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

#### Lỗi: Database connection failed

```bash
# Kiểm tra PostgreSQL container
docker compose ps postgres

# Kiểm tra logs
docker compose logs postgres

# Restart container
docker compose restart postgres
```

#### Lỗi: Redis connection failed

```bash
# Kiểm tra Redis container
docker compose ps redis

# Test connection
docker exec -it mediationpro-redis redis-cli ping
```

#### Superset không truy cập được

- Truy cập Superset tại **http://localhost:8088** hoặc **http://&lt;IP-server&gt;:8088**. Đăng nhập mặc định: `admin` / `admin`.
- Nếu dùng firewall, mở port: `sudo ufw allow 8088/tcp`.
- Kiểm tra container: `docker compose ps superset` và `docker compose logs superset`.

#### Lỗi: Failed to read NuGet.Config due to unauthorized access

Lỗi này xảy ra khi user `amobear` không có quyền đọc file NuGet.Config.

**Giải pháp:**

```bash
# 1. Tạo và phân quyền cho thư mục NuGet
sudo mkdir -p /home/amobear/.nuget/NuGet
sudo mkdir -p /home/amobear/.config/NuGet
sudo chown -R amobear:amobear /home/amobear/.nuget
sudo chown -R amobear:amobear /home/amobear/.config

# 2. Đảm bảo toàn bộ /home/amobear thuộc về user amobear
sudo chown -R amobear:amobear /home/amobear

# 3. Kiểm tra quyền
ls -la /home/amobear/.nuget
ls -la /home/amobear/.config

# 4. Thử restore lại
cd /home/amobear/Amobear.Mediation.Tools/backend
sudo -u amobear dotnet restore

# 5. Nếu vẫn lỗi, xóa cache NuGet và tạo lại
sudo rm -rf /home/amobear/.nuget
sudo rm -rf /home/amobear/.config/NuGet
sudo mkdir -p /home/amobear/.nuget/NuGet
sudo mkdir -p /home/amobear/.config/NuGet
sudo chown -R amobear:amobear /home/amobear/.nuget
sudo chown -R amobear:amobear /home/amobear/.config
```

#### Lỗi: System.UnauthorizedAccessException: Access to the path '/home/amobear/.dotnet' is denied

Lỗi này xảy ra khi user `amobear` không có quyền truy cập vào thư mục `.dotnet` (cache của .NET).

**Giải pháp:**

```bash
# 1. Đảm bảo user amobear đã được tạo đúng cách
id amobear

# 2. Tạo và phân quyền cho thư mục .dotnet
sudo mkdir -p /home/amobear/.dotnet
sudo chown -R amobear:amobear /home/amobear/.dotnet

# 3. Đảm bảo toàn bộ /home/amobear thuộc về user amobear
sudo chown -R amobear:amobear /home/amobear

# 4. Kiểm tra quyền
ls -la /home/amobear | grep dotnet

# 5. Restart service
sudo systemctl restart mediationpro-api

# 6. Kiểm tra logs để xác nhận đã fix
sudo journalctl -u mediationpro-api -f
```

**Nếu vẫn gặp lỗi, thử:**

```bash
# Xóa cache .dotnet và tạo lại
sudo rm -rf /home/amobear/.dotnet
sudo mkdir -p /home/amobear/.dotnet
sudo chown -R amobear:amobear /home/amobear/.dotnet
sudo chmod 755 /home/amobear/.dotnet

# Hoặc chạy dotnet restore với user amobear để tạo cache
sudo -u amobear bash -c "cd /home/amobear/Amobear.Mediation.Tools/backend && dotnet restore"
```

#### Lỗi: .NET SDK not found

```bash
# Kiểm tra .NET SDK
dotnet --version

# Nếu chưa cài, cài lại
sudo apt install -y dotnet-sdk-8.0
```

#### Lỗi: pnpm not found hoặc "command not found"

**Giải pháp 1: Cài đặt lại pnpm**

```bash
# Kiểm tra Node.js và npm đã cài đặt chưa
node --version
npm --version

# Cài đặt pnpm với npm
sudo npm install -g pnpm

# Kiểm tra lại
pnpm --version
```

**Giải pháp 2: Sử dụng Corepack (nếu Node.js >= 16.13)**

```bash
# Kích hoạt Corepack
sudo corepack enable

# Cài đặt pnpm
sudo corepack prepare pnpm@latest --activate

# Kiểm tra
pnpm --version
```

**Giải pháp 3: Cài đặt standalone**

```bash
# Tải và cài đặt pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Reload shell
source ~/.bashrc
# Hoặc nếu dùng zsh:
# source ~/.zshrc

# Kiểm tra
pnpm --version
```

**Giải pháp 4: Kiểm tra PATH**

```bash
# Kiểm tra pnpm đã được cài đặt chưa
which pnpm

# Nếu không tìm thấy, kiểm tra PATH
echo $PATH

# Thêm npm global bin vào PATH (nếu cần)
export PATH="$PATH:$(npm config get prefix)/bin"

# Hoặc thêm vào ~/.bashrc để permanent
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
source ~/.bashrc
```

**Giải pháp 5: Sử dụng npm thay thế (tạm thời)**

Nếu không thể cài đặt pnpm, bạn có thể sử dụng npm:

```bash
# Sử dụng npm thay vì pnpm
cd frontend
npm install
npm run dev
```

**Lưu ý**: Nếu dùng npm, các lệnh tương đương:
- `pnpm install` → `npm install`
- `pnpm dev` → `npm run dev`
- `pnpm build` → `npm run build`
- `pnpm start` → `npm start`

#### Lỗi: Environment Variables không được nhận sau khi sửa .env.local

**Vấn đề:** Sau khi sửa file `.env.local` và restart service `mediationpro-frontend`, các thay đổi không có hiệu lực.

**Nguyên nhân:**

Next.js embed các biến môi trường có prefix `NEXT_PUBLIC_*` vào JavaScript bundle khi **build time**, không phải runtime. Khi chạy `pnpm start` (production mode), code đã được build sẵn với các giá trị cũ.

**Giải pháp:**

**Cách 1: Sử dụng service với wrapper script (Khuyến nghị - Đã cấu hình sẵn)**

Nếu bạn đã cấu hình service với wrapper script `start-frontend-with-build.sh` như trong hướng dẫn, chỉ cần:

```bash
# 1. Sửa file .env.local
cd /home/amobear/Amobear.Mediation.Tools/frontend
sudo -u amobear nano .env.local

# 2. Restart service (service sẽ tự động rebuild)
sudo systemctl restart mediationpro-frontend

# 3. Kiểm tra logs để xác nhận rebuild
sudo journalctl -u mediationpro-frontend -f
```

Service sẽ tự động phát hiện `.env.local` mới hơn build và rebuild trước khi start.

**Cách 2: Rebuild thủ công (Nếu không dùng wrapper script)**

Nếu service chưa được cấu hình với wrapper script:

```bash
# 1. Dừng service
sudo systemctl stop mediationpro-frontend

# 2. Sửa file .env.local
cd /home/amobear/Amobear.Mediation.Tools/frontend
sudo -u amobear nano .env.local

# 3. REBUILD (BẮT BUỘC)
sudo -u amobear pnpm build

# 4. Khởi động lại service
sudo systemctl start mediationpro-frontend

# 5. Kiểm tra logs
sudo journalctl -u mediationpro-frontend -f
```

**Cách 2: Sử dụng Development Mode (Cho môi trường dev/test)**

Nếu cần thay đổi environment variables thường xuyên mà không muốn rebuild, có thể chạy ở development mode:

Sửa file service `/etc/systemd/system/mediationpro-frontend.service`:

```ini
[Service]
# Thay đổi từ pnpm start sang pnpm dev
ExecStart=/usr/bin/pnpm dev
Environment=NODE_ENV=development
Environment=NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Lưu ý:** Development mode không phù hợp cho production vì:
- Hiệu suất thấp hơn
- Không tối ưu hóa code
- Tốn nhiều tài nguyên hơn

**Cách 3: Sử dụng Environment Variables trong systemd service**

Thay vì sửa `.env.local`, có thể set trực tiếp trong service file:

```ini
[Service]
Environment=NEXT_PUBLIC_API_URL=http://your-api-url:5000
```

Sau đó rebuild và restart:

```bash
cd /home/amobear/Amobear.Mediation.Tools/frontend
sudo -u amobear pnpm build
sudo systemctl daemon-reload
sudo systemctl restart mediationpro-frontend
```

**Kiểm tra biến môi trường đã được nhận:**

```bash
# Xem logs để kiểm tra
sudo journalctl -u mediationpro-frontend -f

# Hoặc kiểm tra trong browser console
# Mở DevTools > Console và gõ:
# console.log(process.env.NEXT_PUBLIC_API_URL)
```

**Script tự động rebuild và restart:**

Tạo file `/home/amobear/Amobear.Mediation.Tools/scripts/rebuild-frontend.sh`:

```bash
#!/bin/bash
set -e

cd /home/amobear/Amobear.Mediation.Tools/frontend

echo "🛑 Stopping frontend service..."
sudo systemctl stop mediationpro-frontend

echo "🔨 Building frontend..."
sudo -u amobear pnpm build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Starting frontend service..."
    sudo systemctl start mediationpro-frontend
    sleep 2
    echo "📊 Service status:"
    sudo systemctl status mediationpro-frontend --no-pager -l
else
    echo "❌ Build failed! Service not restarted."
    exit 1
fi
```

Cấp quyền và sử dụng:

```bash
chmod +x /home/amobear/Amobear.Mediation.Tools/scripts/rebuild-frontend.sh
sudo /home/amobear/Amobear.Mediation.Tools/scripts/rebuild-frontend.sh
```

#### Lỗi: Could not find a production build in the '.next' directory

**Vấn đề:** Service frontend báo lỗi "Could not find a production build in the '.next' directory" khi start.

**Nguyên nhân:**
- Service đang cố start nhưng chưa có build directory
- Script wrapper không chạy được hoặc build failed
- Service không sử dụng wrapper script

**Giải pháp:**

**Cách 1: Kiểm tra và sửa script wrapper (Nếu đã cấu hình với wrapper script)**

```bash
# 1. Kiểm tra script có tồn tại và có quyền thực thi
ls -la /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh

# 2. Nếu thiếu quyền, cấp quyền
sudo chmod +x /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh
sudo chown amobear:amobear /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh

# 3. Test script thủ công
sudo -u amobear /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh

# 4. Nếu script chạy được, restart service
sudo systemctl restart mediationpro-frontend
```

**Cách 2: Build thủ công trước khi start service**

```bash
# 1. Dừng service
sudo systemctl stop mediationpro-frontend

# 2. Build thủ công
cd /home/amobear/Amobear.Mediation.Tools/frontend
sudo -u amobear pnpm build

# 3. Kiểm tra build đã thành công
ls -la /home/amobear/Amobear.Mediation.Tools/frontend/.next

# 4. Nếu build thành công, start service
sudo systemctl start mediationpro-frontend

# 5. Kiểm tra logs
sudo journalctl -u mediationpro-frontend -f
```

**Cách 3: Kiểm tra service configuration**

```bash
# 1. Kiểm tra service file có dùng wrapper script không
sudo cat /etc/systemd/system/mediationpro-frontend.service | grep ExecStart

# 2. Nếu không dùng wrapper script, cập nhật service file theo hướng dẫn
# 3. Reload và restart
sudo systemctl daemon-reload
sudo systemctl restart mediationpro-frontend
```

**Cách 4: Kiểm tra pnpm và dependencies**

```bash
# 1. Kiểm tra pnpm có sẵn không
which pnpm
pnpm --version

# 2. Nếu không có, cài đặt
sudo npm install -g pnpm

# 3. Kiểm tra dependencies đã được cài đặt chưa
cd /home/amobear/Amobear.Mediation.Tools/frontend
ls -la node_modules

# 4. Nếu chưa có, cài đặt
sudo -u amobear pnpm install

# 5. Build lại
sudo -u amobear pnpm build
```

**Cách 5: Kiểm tra quyền truy cập**

```bash
# 1. Kiểm tra quyền thư mục frontend
ls -la /home/amobear/Amobear.Mediation.Tools/frontend

# 2. Đảm bảo user amobear có quyền
sudo chown -R amobear:amobear /home/amobear/Amobear.Mediation.Tools/frontend

# 3. Đảm bảo có quyền ghi vào thư mục .next
sudo -u amobear mkdir -p /home/amobear/Amobear.Mediation.Tools/frontend/.next
sudo chown -R amobear:amobear /home/amobear/Amobear.Mediation.Tools/frontend/.next
```

**Debug chi tiết:**

```bash
# Xem logs chi tiết của service
sudo journalctl -u mediationpro-frontend -n 100 --no-pager

# Chạy script wrapper thủ công với user amobear để xem lỗi
sudo -u amobear bash -x /home/amobear/Amobear.Mediation.Tools/scripts/start-frontend-with-build.sh
```

#### Lỗi: SSL Certificate

```bash
# Trust development certificate
dotnet dev-certs https --trust

# Hoặc chạy với HTTP
# Sửa appsettings.json để chỉ dùng HTTP
```

---

## 🔐 Bảo Mật (Production)

### 1. Thay Đổi Mật Khẩu Mặc Định

**PostgreSQL:**
```bash
# Thay đổi password trong docker-compose.yml (POSTGRES_PASSWORD, PGPASSWORD trong postgres-init)
# Cập nhật ConnectionStrings trong appsettings.Production.json
# Sau đó restart container
docker compose down
docker compose up -d
```

**RabbitMQ:**
```bash
# Thay đổi password trong docker-compose.yml
# Sau đó restart container
```

### 2. Cấu Hình Firewall

```bash
# Chỉ cho phép các ports cần thiết
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Frontend (nếu cần)
sudo ufw allow 8088/tcp # Superset (nếu truy cập trực tiếp)
sudo ufw enable
```

### 3. Sử Dụng Reverse Proxy (Nginx)

Cài đặt Nginx và cấu hình reverse proxy:

```bash
sudo apt install -y nginx
```

Cấu hình Nginx:

```nginx
# /etc/nginx/sites-available/mediationpro
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kích hoạt site:

```bash
sudo ln -s /etc/nginx/sites-available/mediationpro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📚 Tài Liệu Tham Khảo

- [.NET 8.0 Documentation](https://learn.microsoft.com/en-us/dotnet/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [StarRocks Documentation](https://docs.starrocks.io/)
- [Apache Superset Documentation](https://superset.apache.org/docs/intro)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs của các services
2. Xem tài liệu troubleshooting trong thư mục `docs/`
3. Tạo issue trên repository

---

**Chúc bạn cài đặt thành công! 🎉**
