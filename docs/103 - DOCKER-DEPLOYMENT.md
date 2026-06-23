# Triển khai Backend & Frontend bằng Docker và CI/CD

Hướng dẫn chuyển backend (`.NET`) và frontend (Next.js) chạy dạng service trên OS sang **Docker**, dùng **config mount từ host** và thiết lập **CI/CD** (GitHub → build → deploy).

---

## 1. Tổng quan

| Thành phần | Image / Service | Config |
|------------|-----------------|--------|
| Backend (API) | `mediationpro-backend:latest` | Mount `./config/backend/` → `/app/config` (appsettings.json, appsettings.Production.json) |
| Frontend (Next.js) | `mediationpro-frontend:latest` | Build-arg `NEXT_PUBLIC_API_URL` lúc build image |

- Code đã có trên GitHub; server kéo code và chạy `docker compose` (hoặc CI build image rồi server pull và chạy).
- Toàn bộ cấu hình theo môi trường (appsettings, env) chỉnh trên host qua thư mục `config/`, không cần sửa trong image.

---

## 2. Chuẩn bị trên server (một lần)

### 2.1 Cài đặt

- Docker Engine + Docker Compose (v2).
- Git (để clone/pull repo).

### 2.2 Clone repo và tạo config

```bash
cd /opt   # hoặc thư mục bạn dùng
git clone https://github.com/YOUR_ORG/Amobear.Mediation.Tools.git
cd Amobear.Mediation.Tools
```

Tạo cấu hình backend (bắt buộc trước khi chạy backend container):

```bash
mkdir -p config/backend
cp config/backend/appsettings.Example.json config/backend/appsettings.json
cp config/backend/appsettings.Example.json config/backend/appsettings.Production.json
```

Chỉnh `config/backend/appsettings.json` và `appsettings.Production.json`:

- **ConnectionStrings**: đổi `YOUR_POSTGRES_PASSWORD`, `YOUR_RABBITMQ_PASSWORD`; giữ host là `postgres`, `redis`, `rabbitmq`, `minio`, `starrocks` (tên service Docker).
- **MinIO**: `Endpoint`: `minio:9000`, **SecretKey** thật.
- **StarRocks**: `Server`/`HttpHost`: `starrocks`, port 9030/8030.
- **Jwt:Secret**: chuỗi bí mật đủ mạnh (≥ 32 byte).
- **Cors:AllowedOrigins**: thêm domain frontend thật (vd: `https://mediation.your-domain.com`).

Lưu ý: **Không commit** file `config/backend/appsettings.json` và `appsettings.Production.json` (đã nằm trong .gitignore).

---

## 3. Build và chạy (lần đầu / sau khi đổi code)

### 3.1 Build image backend & frontend

Từ **thư mục gốc repo** (nơi có `docker-compose.yml`):

```bash
docker compose build backend frontend
```

Frontend cần URL API đúng theo môi trường (build-time):

- **Cùng server, user truy cập qua IP/domain**: dùng URL mà trình duyệt gọi tới API, ví dụ:
  ```bash
  docker compose build --build-arg NEXT_PUBLIC_API_URL=https://api.your-domain.com frontend
  ```
- **Chạy local (localhost)**:
  ```bash
  docker compose build --build-arg NEXT_PUBLIC_API_URL=http://localhost:5000 frontend
  ```

Có thể đặt build-arg mặc định trong `docker-compose.yml` (mục `frontend.build.args.NEXT_PUBLIC_API_URL`) rồi chỉ cần:

```bash
docker compose build backend frontend
```

### 3.2 Chạy toàn bộ stack (infra + backend + frontend)

```bash
docker compose up -d
```

Backend lắng nghe trong container ở port **8080** (map ra host **5000**). Frontend map **3000:3000**.

Kiểm tra:

- Backend: `curl http://localhost:5000/health`
- Frontend: mở `http://localhost:3000` (hoặc domain bạn cấu hình).

### 3.3 Chỉ restart backend hoặc frontend (sau khi sửa config)

Sau khi sửa file trong `config/backend/`:

```bash
docker compose restart backend
```

Sau khi đổi **NEXT_PUBLIC_API_URL** (hoặc code frontend), cần build lại rồi tạo container mới:

```bash
docker compose build frontend && docker compose up -d frontend
```

---

## 4. Config mount – chỉnh theo môi trường

### 4.1 Backend

- **Vị trí trên host**: `./config/backend/`
- **Trong container**: mount vào `/app/config`
- **File dùng**: `appsettings.json`, `appsettings.Production.json` (và các `appsettings.{Environment}.json` nếu cần).
- Thứ tự ưu tiên (sau cùng override): file trong image → **/app/config/** → biến môi trường.
- Chỉnh xong cấu hình → `docker compose restart backend`.

### 4.2 Frontend

- **NEXT_PUBLIC_API_URL**: chỉ có hiệu lực lúc **build** image. Muốn đổi theo môi trường thì build lại với `--build-arg NEXT_PUBLIC_API_URL=<url>` (hoặc sửa `docker-compose.yml` rồi build lại).

---

## 5. CI/CD – GitHub Actions (build & push image)

Luồng gợi ý: **push code → GitHub Actions build image → push lên registry (GHCR/Docker Hub) → trên server pull và chạy `docker compose up -d`.**

### Bước 5.1: Tạo GitHub Personal Access Token (PAT) hoặc dùng GITHUB_TOKEN

- Nếu dùng **GitHub Container Registry (GHCR)**:
  - Repo → Settings → Actions → General → Workflow permissions: **Read and write**.
  - Hoặc tạo PAT có quyền `write:packages`, `read:packages` và thêm vào repo **Secrets** (vd: `REGISTRY_TOKEN`).
- Nếu dùng **Docker Hub**: thêm Secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

### Bước 5.2: Workflow build và push

File mẫu: **`.github/workflows/docker-build-push.yml`** (xem ở cuối tài liệu này). Workflow này:

- Chạy khi push nhánh `main` (hoặc tag).
- Build image **backend** và **frontend**.
- Push lên **GitHub Container Registry** (ghcr.io) với tag `latest` và tag theo commit SHA.

Bạn có thể đổi sang Docker Hub bằng cách sửa `login` và image name trong workflow.

### Bước 5.3: Trên server – pull và deploy

Sau khi Actions build xong:

1. Đăng nhập registry (nếu dùng GHCR):
   ```bash
   echo $GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```
2. Kéo image mới và khởi động lại:
   ```bash
   cd /opt/Amobear.Mediation.Tools
   docker compose pull backend frontend
   docker compose up -d backend frontend
   ```

Có thể gắn bước này vào **cron** (chạy mỗi 5 phút) hoặc dùng **webhook** (vd: GitHub deploy hook, hoặc script gọi SSH từ Actions) để tự động pull + up sau khi build thành công.

### Bước 5.4: Deploy tự động qua SSH (tùy chọn)

- Trên server: cấu hình SSH key hoặc token.
- Trong repo: thêm Secret chứa SSH private key hoặc host/token.
- Trong workflow: thêm job “deploy” chạy sau job build: SSH vào server và chạy `docker compose pull && docker compose up -d backend frontend`.

Chi tiết triển khai phụ thuộc cách bạn bảo mật (SSH key, deploy user, firewall). Có thể bắt đầu bằng pull + up thủ công, sau đó tự động hóa dần.

---

## 6. Checklist triển khai

- [ ] Server đã cài Docker + Docker Compose.
- [ ] Repo đã clone/pull trên server.
- [ ] Đã tạo `config/backend/appsettings.json` (và Production) từ file Example, chỉnh ConnectionStrings, MinIO, StarRocks, Jwt, Cors.
- [ ] Đã build frontend với `NEXT_PUBLIC_API_URL` đúng (hoặc đặt trong docker-compose).
- [ ] Chạy `docker compose up -d`; kiểm tra `curl http://localhost:5000/health` và mở frontend.
- [ ] (Tùy chọn) Bật GitHub Actions workflow build/push; cấu hình Secrets (PAT hoặc Docker Hub).
- [ ] (Tùy chọn) Tự động deploy: cron hoặc webhook chạy `docker compose pull && docker compose up -d backend frontend`.

---

## 7. File workflow mẫu (GitHub Actions)

Tạo file **`.github/workflows/docker-build-push.yml`** với nội dung tương tự sau (đã dùng GHCR; có thể đổi sang Docker Hub):

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (backend)
        id: meta-backend
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository_owner }}/mediationpro-backend
          tags: |
            type=raw,value=latest
            type=sha,prefix=

      - name: Build and push Backend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: backend/Dockerfile
          push: true
          tags: ${{ steps.meta-backend.outputs.tags }}
          labels: ${{ steps.meta-backend.outputs.labels }}

      - name: Extract metadata (frontend)
        id: meta-frontend
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository_owner }}/mediationpro-frontend
          tags: |
            type=raw,value=latest
            type=sha,prefix=

      - name: Build and push Frontend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: frontend/Dockerfile
          push: true
          tags: ${{ steps.meta-frontend.outputs.tags }}
          labels: ${{ steps.meta-frontend.outputs.labels }}
          build-args: |
            NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL || 'http://localhost:5000' }}
```

Lưu ý: `vars.NEXT_PUBLIC_API_URL` có thể đặt trong repo **Settings → Variables** để build frontend với URL API production. Nếu không đặt, dùng `http://localhost:5000`.

Sau khi bật workflow, trên server có thể **dùng image từ registry** thay vì build local:

1. Sửa `docker-compose.yml`: với service `backend` và `frontend`, đổi thành dùng `image` từ GHCR (giữ nguyên `volumes`, `environment`, `depends_on`):
   - `backend`: `image: ghcr.io/YOUR_GITHUB_ORG/mediationpro-backend:latest`
   - `frontend`: `image: ghcr.io/YOUR_GITHUB_ORG/mediationpro-frontend:latest`
2. Đăng nhập: `echo $GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin`
3. Deploy: `docker compose pull backend frontend && docker compose up -d backend frontend`
