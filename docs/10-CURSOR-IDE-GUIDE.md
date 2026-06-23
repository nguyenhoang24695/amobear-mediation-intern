# Hướng dẫn sử dụng Cursor IDE

Cursor IDE dựa trên VS Code, nên có các tính năng và phím tắt tương tự.

## Tra cứu Code (Navigation)

### 1. Go to Definition
**Phím tắt:** `F12` hoặc `Ctrl + Click`

Đặt cursor trên symbol (class, method, variable) và nhấn `F12` để đi đến định nghĩa của nó.

**Ví dụ:**
- Đặt cursor trên `IAdMobAuthManager` → `F12` → Đi đến file interface
- Đặt cursor trên `GetAccessTokenAsync` → `F12` → Đi đến method definition

### 2. Peek Definition (Xem nhanh)
**Phím tắt:** `Alt + F12`

Hiển thị definition trong popup window mà không cần rời file hiện tại. Rất hữu ích khi muốn xem nhanh mà không muốn chuyển file.

### 3. Go to Type Definition
**Phím tắt:** `Ctrl + F12`

Đi đến type definition của biến (khác với Go to Definition).

### 4. Find All References
**Phím tắt:** `Shift + F12`

Tìm tất cả nơi sử dụng symbol hiện tại. Hiển thị trong panel bên dưới.

**Ví dụ:**
- Đặt cursor trên `AdMobToken` → `Shift + F12` → Xem tất cả nơi sử dụng class này

### 5. Go Back / Go Forward
**Phím tắt:** 
- `Alt + ←` (Go Back)
- `Alt + →` (Go Forward)

Quay lại/về vị trí trước đó sau khi navigate.

### 6. Breadcrumbs
**Bật:** View → Appearance → Show Breadcrumbs

Hiển thị đường dẫn file hiện tại ở trên cùng. Click vào để navigate nhanh.

### 7. Quick Open File
**Phím tắt:** `Ctrl + P`

Tìm và mở file nhanh bằng cách gõ tên file.

### 8. Go to Symbol in Workspace
**Phím tắt:** `Ctrl + T`

Tìm symbol (class, method) trong toàn bộ workspace.

**Ví dụ:** Gõ `AdMobAuthManager` → Tìm tất cả class/method có tên này

### 9. Go to Symbol in File
**Phím tắt:** `Ctrl + Shift + O`

Tìm symbol trong file hiện tại. Rất hữu ích cho file dài.

## Debug trong Cursor

### Bước 1: Cài đặt Extension

1. Mở Extensions: `Ctrl + Shift + X`
2. Tìm và cài:
   - **"C#"** (Anysphere) - Extension chính thức của Cursor IDE
   - Hoặc **"C#"** (Microsoft) - Nếu không có bản Anysphere

**Lưu ý:** Cursor IDE thường có sẵn C# extension của Anysphere. Nếu không thấy, bạn có thể:
- Cài "C#" extension từ Microsoft (ms-dotnettools.csharp)
- Hoặc sử dụng extension có sẵn trong Cursor

Extension sẽ cung cấp:
- IntelliSense cho C#
- Debug support
- Code navigation
- Formatting

### Bước 2: Sử dụng Debug

Các file cấu hình đã được tạo sẵn trong `.vscode/`:
- `launch.json` - Cấu hình debug
- `tasks.json` - Cấu hình build tasks

#### Đặt Breakpoint

1. **Click vào gutter** (vùng bên trái số dòng) để đặt breakpoint
2. Hoặc đặt cursor trên dòng và nhấn `F9`
3. Breakpoint sẽ hiển thị dấu chấm đỏ

#### Start Debugging

1. Mở Run and Debug panel: `Ctrl + Shift + D`
2. Chọn configuration: **".NET Core Launch (API)"**
3. Nhấn `F5` hoặc click nút "Start Debugging"

#### Các phím tắt Debug

- **`F5`** - Continue (chạy tiếp đến breakpoint tiếp theo)
- **`F10`** - Step Over (chạy dòng hiện tại, không vào function)
- **`F11`** - Step Into (vào trong function)
- **`Shift + F11`** - Step Out (ra khỏi function hiện tại)
- **`Shift + F5`** - Stop (dừng debug)
- **`Ctrl + Shift + F5`** - Restart (restart debug session)
- **`F9`** - Toggle Breakpoint

#### Debug Configurations

Có 3 configurations sẵn:

1. **".NET Core Launch (API)"** - Build và chạy API
2. **".NET Core Attach"** - Attach vào process đang chạy
3. **".NET Core Launch (API - No Build)"** - Chạy mà không build (nhanh hơn nếu đã build)

### Bước 3: Xem Variables và Call Stack

Khi đang debug:

- **Variables panel** - Xem giá trị biến hiện tại
- **Watch panel** - Thêm biến để theo dõi
- **Call Stack** - Xem stack trace
- **Breakpoints** - Quản lý breakpoints

### Bước 4: Debug Console

Trong khi debug, bạn có thể:
- Gõ code C# trong Debug Console để test
- Xem output và logs
- Evaluate expressions

## Phím tắt hữu ích khác

### Navigation
- `Ctrl + P` - Quick Open (tìm file)
- `Ctrl + Shift + P` - Command Palette
- `Ctrl + T` - Go to Symbol in Workspace
- `Ctrl + Shift + O` - Go to Symbol in File
- `Ctrl + G` - Go to Line
- `Ctrl + B` - Toggle Sidebar

### Editing
- `Ctrl + /` - Toggle comment
- `Alt + Shift + F` - Format document
- `Ctrl + K, Ctrl + F` - Format selection
- `Ctrl + D` - Select word (nhấn nhiều lần để select nhiều)
- `Alt + Click` - Multi-cursor
- `Ctrl + Shift + L` - Select all occurrences
- `F2` - Rename symbol

### Search & Replace
- `Ctrl + F` - Find in file
- `Ctrl + H` - Replace in file
- `Ctrl + Shift + F` - Find in files
- `Ctrl + Shift + H` - Replace in files

### File Management
- `Ctrl + N` - New file
- `Ctrl + S` - Save
- `Ctrl + Shift + S` - Save As
- `Ctrl + W` - Close tab
- `Ctrl + K, W` - Close all tabs

### Terminal
- `` Ctrl + ` `` - Toggle terminal
- `Ctrl + Shift + `` ` `` - New terminal
- `Ctrl + Shift + C` - Copy path

### Git
- `Ctrl + Shift + G` - Open Source Control
- `Ctrl + Enter` - Commit
- `Ctrl + Shift + P` → "Git: Push" - Push

## Tips & Tricks

### 1. Multi-cursor Editing
- `Alt + Click` - Thêm cursor
- `Ctrl + Alt + ↑/↓` - Thêm cursor ở dòng trên/dưới
- `Ctrl + D` - Select word và thêm cursor ở occurrence tiếp theo

### 2. Code Snippets
Cursor có sẵn snippets cho C#:
- Gõ `class` → Tab → Tạo class
- Gõ `ctor` → Tab → Tạo constructor
- Gõ `prop` → Tab → Tạo property

### 3. IntelliSense
- `Ctrl + Space` - Trigger IntelliSense
- `Ctrl + Shift + Space` - Trigger parameter hints

### 4. Quick Fix
- `Ctrl + .` - Show quick fix/suggestions
- Rất hữu ích để:
  - Add using statements
  - Generate code
  - Refactor

### 5. Command Palette
- `Ctrl + Shift + P` - Mở Command Palette
- Gõ tên command để tìm và chạy

**Ví dụ:**
- "Format Document"
- "Go to Symbol"
- "Git: Push"
- "Debug: Start Debugging"

## Troubleshooting

### Debug không hoạt động

1. **Kiểm tra extension đã cài chưa:**
   - Mở Extensions (`Ctrl + Shift + X`)
   - Tìm "C# Dev Kit" hoặc "C#"
   - Đảm bảo đã cài và enable

2. **Kiểm tra .NET SDK:**
   ```bash
   dotnet --version
   ```
   Phải có .NET 8 SDK

3. **Rebuild project:**
   - `Ctrl + Shift + P` → "Tasks: Run Task" → "build"
   - Hoặc chạy: `dotnet build`

4. **Kiểm tra launch.json:**
   - Đảm bảo đường dẫn `program` đúng
   - Đảm bảo `preLaunchTask` là "build"

### IntelliSense không hoạt động

1. **Restart OmniSharp:**
   - `Ctrl + Shift + P` → "OmniSharp: Restart OmniSharp"

2. **Reload Window:**
   - `Ctrl + Shift + P` → "Developer: Reload Window"

### Go to Definition không hoạt động

1. **Kiểm tra file có trong solution:**
   - Đảm bảo file nằm trong project được reference

2. **Build project:**
   - IntelliSense cần project đã build để hoạt động tốt

## Lưu ý về Cursor IDE

Cursor IDE sử dụng C# extension của Anysphere (bản riêng của Cursor), không phải C# Dev Kit của Microsoft. Extension này vẫn hỗ trợ đầy đủ:
- IntelliSense
- Debug
- Code navigation
- Formatting

Nếu không thấy extension của Anysphere, bạn có thể cài "C#" extension từ Microsoft.

## Tài liệu tham khảo

- [Cursor IDE Documentation](https://cursor.sh/docs)
- [VS Code C# Extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp)
- [VS Code Keyboard Shortcuts](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf)

## Tóm tắt phím tắt quan trọng

| Chức năng | Phím tắt |
|-----------|----------|
| Go to Definition | `F12` |
| Peek Definition | `Alt + F12` |
| Find All References | `Shift + F12` |
| Go Back | `Alt + ←` |
| Go Forward | `Alt + →` |
| Start Debug | `F5` |
| Step Over | `F10` |
| Step Into | `F11` |
| Step Out | `Shift + F11` |
| Toggle Breakpoint | `F9` |
| Stop Debug | `Shift + F5` |
| Quick Open | `Ctrl + P` |
| Command Palette | `Ctrl + Shift + P` |
| Format Document | `Alt + Shift + F` |
| Toggle Comment | `Ctrl + /` |
