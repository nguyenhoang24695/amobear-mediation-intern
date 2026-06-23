# 24 - META ADS CREATE REQUEST USER MANUAL

## Mục Đích

Tài liệu này chỉ hướng dẫn thao tác trên trang `Meta Ads > Requests > Create`.

Trang này dùng để tạo một request nội bộ cho campaign Meta Ads. Request chưa tạo campaign ngay trên Meta. Campaign, ad set, creative và ad chỉ được tạo sau khi request được approve và execute. Khi tạo trên Meta, các object bắt đầu ở trạng thái `PAUSED`.

## Trang Này Tạo Gì Trên Meta Ads

| Phần trên trang | Object/thiết lập tương ứng trên Meta Ads |
| --- | --- |
| `Account & App Readiness` | Chọn ad account, app, promoted object và kiểm tra token |
| `Campaign Settings` | Tạo cấu hình cấp `Campaign` |
| `Ad Set - Audience & Placement` | Tạo targeting và placement cấp `Ad Set` |
| `Ad Set - Budget, Bidding & Schedule` | Tạo budget, bidding, optimization, billing và lịch chạy cấp `Ad Set` |
| `Creative` | Tạo nội dung quảng cáo cấp `Creative` |
| `Ad` | Tạo object `Ad`, nối ad set với creative |
| Cột bên phải | Kiểm tra readiness, compatibility, preview payload và validation errors |

## Thứ Tự Thao Tác Khuyến Nghị

1. Chọn `Meta Ad Account`.
2. Chọn `App`.
3. Kiểm tra `Promoted Object`.
4. Điền `Campaign Settings`.
5. Điền `Ad Set - Audience & Placement`.
6. Điền `Ad Set - Budget, Bidding & Schedule`.
7. Điền `Creative`.
8. Điền `Ad`.
9. Xem `Readiness Checklist` bên phải.
10. Bấm `Save Draft`.
11. Bấm `Validate`.
12. Nếu không còn lỗi blocking, bấm `Submit for Approval`.

## Thanh Action Trên Cùng

| Action | Dùng khi nào | Điều gì xảy ra |
| --- | --- | --- |
| `Discard` | Muốn rời trang và bỏ thay đổi chưa lưu | Quay lại list/detail request |
| `Save Draft` / `Update Draft` / `Save Changes` | Muốn lưu request đang nhập | Lưu payload nội bộ, chưa gọi Meta API |
| `Validate` | Muốn kiểm tra request trước khi submit | Backend kiểm tra payload và hiển thị lỗi nếu có |
| `Submit for Approval` | Request đã sẵn sàng để reviewer duyệt | Chuyển request sang `pending_approval`, chưa tạo object trên Meta |

Lưu ý:

- `Submit for Approval` không tạo campaign trên Meta.
- Meta API chỉ được gọi ở bước execute sau approval.
- Nếu integration token bị expired, thiếu quyền hoặc invalid, nút submit sẽ bị chặn.

## 1. Account & App Readiness

Phần này xác định request sẽ chạy bằng ad account nào và quảng cáo app nào.

### Meta Ad Account

`Meta Ad Account` là tài khoản quảng cáo dùng để tạo campaign và ghi nhận spend trên Meta.

Khi chọn ad account:

- App dropdown sẽ được load theo các app mà ad account đó có thể advertise.
- Currency của account được dùng cho budget/bid amount.
- Integration/token tương ứng được kiểm tra để biết request có thể submit/execute hay không.

Người dùng cần chọn đúng account trước khi nhập các phần khác. Nếu chọn sai account, app list, page list, media library và city search có thể không đúng.

### Integration Status

`Integration Status` cho biết token kết nối Meta có sẵn sàng không.

| Trạng thái | Ý nghĩa |
| --- | --- |
| `Token Ready` | Có thể submit request |
| `Not Tested` | Có thể tiếp tục nhập, nhưng nên test integration trước khi execute |
| `Token Expired` | Token hết hạn hoặc thiếu, cần cập nhật integration |
| `Missing Permissions` | Token thiếu quyền như `ads_management`, `ads_read` |
| `Invalid Connection` | Lần test connection gần nhất thất bại |
| `Integration Disabled` | Integration hoặc ad account đang bị disable |

### App

`App` là app sẽ được quảng cáo trong campaign.

App trong dropdown là các app đã được mapping với Meta app/store identity cho ad account đang chọn. Nếu app không hiện:

- App chưa có mapping.
- Mapping chưa gắn với ad account đang chọn.
- App mapping bị thiếu Meta Application ID hoặc store URL.
- Cần chạy lại discovery/sync mapping.

### Promoted Object

`Promoted Object` là dữ liệu Meta cần để biết ad set đang quảng cáo app nào.

| Field hiển thị | Ý nghĩa với Meta Ads |
| --- | --- |
| `Application ID` | Gửi vào `promoted_object.application_id` |
| `Platform` | Xác định app là Android hay iOS để derive OS targeting |
| `Store URL` | Gửi vào `promoted_object.object_store_url` hoặc dùng làm fallback link |

Nếu `Platform` là `UNKNOWN`, request có thể bị lỗi `Platform targeting can be derived from app mapping`. Cần sửa app mapping để platform thành `ANDROID` hoặc `IOS`.

### Business Objective

`Business Objective` chọn objective campaign. Với app campaign thông thường, dùng `App promotion`, tương ứng `OUTCOME_APP_PROMOTION`.

## 2. Campaign Settings

Phần này tạo cấu hình cấp `Campaign` trên Meta.

| Field | Tác dụng trên Meta Ads |
| --- | --- |
| `Campaign Name` | Tên campaign trên Meta |
| `Buying Type` | Cách mua quảng cáo, thường dùng `AUCTION` |
| `Campaign Objective` | Objective của campaign, ví dụ `OUTCOME_APP_PROMOTION` |
| `Budget Strategy` | Chọn budget nằm ở campaign hay ad set |
| `Daily Budget` / `Lifetime Budget` trong CBO | Ngân sách cấp campaign |
| `Special Ad Categories` | Khai báo danh mục đặc biệt nếu campaign thuộc credit, employment, housing, politics |
| `Bid Strategy` | Chiến lược giá thầu của campaign/ad set flow |

### Campaign Name

Có thể để auto-generate để tên campaign có app, geo, platform, objective và ngày tạo. Nếu sửa tay, hệ thống giữ tên custom cho đến khi bật lại auto-generate.

### Budget Strategy

| Lựa chọn | Ý nghĩa | Khi dùng |
| --- | --- | --- |
| `Advantage+ campaign budget` / `CBO` | Budget đặt ở campaign, Meta tự phân bổ xuống ad sets | Dùng khi muốn Meta tối ưu phân bổ budget giữa nhiều ad sets |
| `Ad set budget` / `ABO` | Budget đặt riêng từng ad set | Dùng khi muốn kiểm soát budget theo từng ad set |

Nếu chọn CBO, nhập budget ở `Campaign Settings`. Nếu chọn ABO, nhập budget ở `Ad Set - Budget, Bidding & Schedule`.

### Bid Strategy

| Bid strategy | Có cần `Bid Amount` không | Ghi chú |
| --- | --- | --- |
| `LOWEST_COST_WITHOUT_CAP` | Không | Phù hợp để bắt đầu khi chưa có target cost cụ thể |
| `COST_CAP` | Có | Meta cố giữ cost quanh mức cap |
| `LOWEST_COST_WITH_BID_CAP` | Có | Giới hạn bid tối đa |
| `TARGET_COST` | Có | Hướng tới cost ổn định quanh target |
| `LOWEST_COST_WITH_MIN_ROAS` | Chưa hỗ trợ đầy đủ | Có thể bị disable vì thiếu ROAS floor |

Nếu chọn strategy cần `Bid Amount`, phải nhập bid amount trong phần ad set budget/bidding.

## 3. Ad Set - Audience & Placement

Phần này tạo targeting và placement cấp `Ad Set`.

| Field | Tác dụng trên Meta Ads |
| --- | --- |
| `Ad Set Name` | Tên ad set trên Meta |
| `Geo Mode` | Cách chọn vị trí target |
| `Countries` / `Regions` / `Country Group` / `Cities` | Dữ liệu location targeting |
| `Age Range` | Tuổi target |
| `Gender` | Giới tính target |
| `Placement Mode` | Automatic placements hoặc manual placements |
| `Publisher Platforms` | Platform phân phối: Facebook, Instagram, Audience Network, Messenger |
| `Facebook Positions` | Vị trí hiển thị trên Facebook |
| `Instagram Positions` | Vị trí hiển thị trên Instagram |

### Ad Set Name

Có thể để auto-generate theo pattern `GEO_AGE_GENDER_PLACEMENT`. Nếu sửa tay, hệ thống giữ tên custom cho đến khi bật lại auto-generate.

### Geo Mode

Mỗi request chỉ dùng một geo mode.

| Geo Mode | Ý nghĩa |
| --- | --- |
| `Global` | Không gửi country/city list cụ thể lên Meta |
| `Country` | Chọn trực tiếp country code |
| `Region` | Chọn nhóm region nội bộ, hệ thống expand thành countries khi execute |
| `Country Group` | Chọn nhóm country do team tạo và tái sử dụng |
| `City` | Search city từ Meta và target theo city key |

### Age và Gender

`Age Range` và `Gender` được gửi vào targeting của ad set. `All` gender nghĩa là không gửi filter giới tính riêng.

### Placement Mode

| Mode | Ý nghĩa |
| --- | --- |
| `Automatic` | Meta tự chọn placement phù hợp |
| `Manual` | User chọn publisher platforms và positions cụ thể |

Với người mới, nên dùng `Automatic` trừ khi buyer/UA owner có chiến lược placement rõ ràng.

### OS Targeting

Trang không cho nhập OS trực tiếp. OS targeting được derive từ app mapping:

- App Android sẽ target Android.
- App iOS sẽ target iOS.

Nếu checklist báo lỗi không derive được platform, cần sửa app mapping trước.

## 4. Ad Set - Budget, Bidding & Schedule

Phần này tạo ngân sách, tối ưu phân phối, billing và lịch chạy cấp `Ad Set`.

| Field | Tác dụng trên Meta Ads |
| --- | --- |
| `Ad set budget` | Ngân sách cấp ad set, chỉ dùng khi chọn ABO |
| `Billing Event` | Event Meta dùng để tính billing |
| `Performance Goal` | Mục tiêu tối ưu phân phối |
| `App event` | Event app cần tối ưu khi chọn app event |
| `Value event` | Loại value event cần tối ưu khi chọn value |
| `Bid Amount` | Bid/cost cap amount nếu bid strategy yêu cầu |
| `Advantage Audience` | Cho phép Meta mở rộng audience hay không |
| `Start Time` | Thời gian bắt đầu ad set |
| `End Time` | Thời gian kết thúc ad set, optional |

### Ad Set Budget

Nếu campaign dùng ABO, phải nhập ít nhất một trong:

- `Daily Budget`
- `Lifetime Budget`

Nếu campaign dùng CBO, phần ad set budget sẽ bị disable vì budget đã nằm ở campaign.

### Billing Event

Với app promotion, `IMPRESSIONS` là lựa chọn phổ biến và an toàn. UI sẽ disable option không tương thích với optimization goal để tránh Meta reject.

### Performance Goal

| Performance Goal | Meta tối ưu cho | Cần nhập thêm |
| --- | --- | --- |
| `APP_INSTALLS` | Người có khả năng cài app | Không |
| `APP_EVENT` | Người có khả năng thực hiện event trong app | `App event` |
| `VALUE` | Giá trị conversion cao hơn | `Value event` |

### App Event và Custom Event

Khi chọn `APP_EVENT`, cần chọn event. Có thể chọn standard event như `PURCHASE`, `SUBSCRIBE`, `START_TRIAL`, hoặc thêm custom event cho app.

### Bid Amount

Chỉ nhập `Bid Amount` khi bid strategy yêu cầu. Nếu dùng `LOWEST_COST_WITHOUT_CAP`, field này bị disable để tránh Meta hiểu nhầm thành cost cap/bid cap.

### Advantage Audience

| Trạng thái | Ý nghĩa |
| --- | --- |
| Enabled | Cho phép Meta mở rộng audience khi có khả năng cải thiện performance |
| Disabled | Giữ targeting chặt hơn theo các điều kiện đã nhập |

### Start Time và End Time

Thời gian nhập theo local time trên form. Backend convert sang UTC khi gửi Meta.

## 5. Creative

Phần này tạo nội dung quảng cáo cấp `Creative`.

| Field/nhóm field | Tác dụng trên Meta Ads |
| --- | --- |
| `Creative Name` | Tên creative nội bộ/trên Meta |
| `Creative Type` | Format creative cần tạo |
| `Facebook Page ID` | Page identity dùng để chạy ad |
| `Instagram Actor ID` | Instagram identity nếu chạy qua Instagram actor riêng |
| Text fields | Nội dung quảng cáo |
| CTA | Call to action của creative |
| Media source | Ảnh/video dùng trong creative |
| Link URL | Link đích; nếu để trống dùng fallback từ app mapping |

### Facebook Page ID

Có 3 cách chọn page:

| Mode | Khi dùng |
| --- | --- |
| Picker từ `Promote Pages` | Dùng mặc định, lấy page theo ad account |
| `Load All Token Pages` | Dùng khi page không nằm trong promote pages nhưng token có quyền access |
| `Enter ID Manually` | Dùng khi đã biết Page ID và picker không trả về |

### Creative Type

| Creative Type | Khi dùng | Dữ liệu cần nhập |
| --- | --- | --- |
| `SINGLE_IMAGE` | Chạy một ảnh tĩnh | Primary text, headline, CTA, image |
| `SINGLE_VIDEO` | Chạy một video | Primary text, headline, CTA, video, thumbnail nếu cần |
| `CAROUSEL_IMAGE` | Chạy nhiều card hình ảnh | Primary text, CTA, ít nhất 2 cards |
| `FLEXIBLE` | Cho Meta chọn format tốt nhất từ nhiều asset | Primary text, headline, CTA, ít nhất 1 asset |
| `EXISTING_POST` | Reuse post có sẵn trên Facebook Page | Source Post ID |

### Text Variations

Một số creative type cho phép thêm nhiều variation cho `Primary Text` và `Headline`. Meta có thể rotate các variation này khi phân phối.

### Media Source

| Mode | Ý nghĩa |
| --- | --- |
| `From Meta` | Chọn image/video có sẵn trong Meta media library của ad account |
| `Manual` | Nhập `Meta Image Hash` hoặc `Meta Video ID` |
| `External URL` | Nhập URL image public |
| `Upload` | Upload file vào Mediation Pro trước, sau đó backend upload sang Meta khi execute |

Lưu ý:

- Upload trong draft chưa upload asset lên Meta.
- Asset chỉ được upload sang Meta khi request execute.
- Với video upload từ máy, có thể tạo thumbnail từ frame video.

### Existing Post

`EXISTING_POST` dùng để chạy lại một Facebook Page post có sẵn.

- Picker load recent posts của page đã chọn.
- Nếu post không có trong picker, dùng manual mode và nhập `object_story_id`.
- Khi dùng existing post, form không tạo message/headline/media mới.

## 6. Ad

Phần này tạo object `Ad` trên Meta và nối creative vào ad set.

| Field | Tác dụng trên Meta Ads |
| --- | --- |
| `Ad Name` | Tên ad trên Meta |
| `Tracking Specs JSON` | Tracking specs raw JSON nếu team cần override tracking |

`Ad Name` có thể auto-generate theo ad set và creative. Nếu sửa tay, hệ thống giữ tên custom cho đến khi bật lại auto-generate.

`Tracking Specs JSON` là advanced field. Nếu không có yêu cầu cụ thể, để trống.

Ví dụ:

```json
[{"action.type":["app_install"],"app":[1234567890]}]
```

## 7. Cột Bên Phải

Cột bên phải giúp kiểm tra request trước khi submit.

| Cụm | Dùng để làm gì |
| --- | --- |
| `Request Status` | Cho biết request chưa lưu, draft hoặc trạng thái hiện tại |
| `Readiness Checklist` | Kiểm tra nhanh các điều kiện cần trước submit |
| `Meta Compatibility` | Kiểm tra billing event, optimization goal, bid strategy và platform targeting |
| `Execution Preview` | Xem các object sẽ tạo trên Meta và trạng thái `PAUSED` |
| `Live Summary` | Tóm tắt campaign, ad set và creative đã nhập |
| `Validation Errors` | Hiển thị lỗi backend sau khi bấm `Validate` |

Các checklist quan trọng cần xanh trước khi submit:

- `Account selected`
- `Integration token valid`
- `Promoted object valid`
- `Budget provided`
- `Performance goal compatible`
- `Billing event compatible`
- `Geo targeting`
- `Platform targeting can be derived from app mapping`
- `Start time format valid`
- `Creative ready`
- `Ad name complete`

## Sau Khi Submit

Sau khi bấm `Submit for Approval`:

1. Request chuyển sang `pending_approval`.
2. Reviewer mở request detail để approve hoặc reject.
3. Khi được approve, user có quyền execute sẽ bấm `Execute Request`.
4. Backend tạo object trên Meta theo thứ tự:
   - campaign
   - ad set
   - creative
   - ad
5. Các object được tạo ở trạng thái `PAUSED`.

## Lỗi Thường Gặp Trên Trang Create Request

### App không hiện trong dropdown

Kiểm tra:

- Đã chọn đúng `Meta Ad Account`.
- App đã có mapping.
- Mapping có `Meta Application ID` và store URL.
- Ad account có quyền advertise app đó.

### Platform targeting báo lỗi

Nguyên nhân thường là app mapping thiếu platform hoặc platform đang là `UNKNOWN`.

Cần sửa mapping để identity có platform `ANDROID` hoặc `IOS`.

### Không submit được do token

Kiểm tra `Integration Status`:

- Token có hết hạn không.
- Token có quyền `ads_management`, `ads_read` không.
- Integration/ad account có bị disabled không.

### Creative chưa ready

Kiểm tra đúng theo creative type:

- `SINGLE_IMAGE`: cần text, headline, CTA, image.
- `SINGLE_VIDEO`: cần text, headline, CTA, video.
- `CAROUSEL_IMAGE`: cần CTA và tối thiểu 2 cards đầy đủ.
- `FLEXIBLE`: cần text, headline, CTA và ít nhất 1 asset.
- `EXISTING_POST`: cần Facebook Page ID và Source Post ID.

### Validate có lỗi JSON tracking specs

Nếu không chắc format `Tracking Specs JSON`, để trống. Chỉ nhập khi team cần tracking spec đặc biệt và đã có JSON hợp lệ.
