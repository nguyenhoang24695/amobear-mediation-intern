# Country Mapping Analysis

> So sánh country names từ Firebase (`silver.geo`) và country codes từ AdMob (`bronze.mediation_table`)

## Các trường hợp Firebase tên khác ISO chuẩn

| AdMob Code | ISO Standard | Firebase Name | Ghi chú |
|------------|--------------|---------------|---------|
| `CZ` | Czech Republic | **Czechia** | Firebase dùng tên mới |
| `TR` | Turkey | **Türkiye** | Firebase dùng Unicode |
| `MM` | Myanmar | **Myanmar (Burma)** | Firebase thêm tên cũ |
| `BA` | Bosnia and Herzegovina | **Bosnia & Herzegovina** | `&` thay `and` |
| `TT` | Trinidad and Tobago | **Trinidad & Tobago** | `&` thay `and` |
| `AG` | Antigua and Barbuda | **Antigua & Barbuda** | `&` thay `and` |
| `KN` | Saint Kitts and Nevis | **St. Kitts & Nevis** | `St.` viết tắt |
| `LC` | Saint Lucia | **St. Lucia** | `St.` viết tắt |
| `VC` | Saint Vincent... | **St. Vincent & Grenadines** | `St.` + `&` |
| `BL` | Saint Barthelemy | **St. Barthélemy** | `St.` + dấu |
| `MF` | Saint Martin | **St. Martin** | `St.` viết tắt |
| `PM` | Saint Pierre and Miquelon | **St. Pierre & Miquelon** | `St.` + `&` |
| `SH` | Saint Helena | **St. Helena** | `St.` viết tắt |
| `CI` | Ivory Coast | **Côte d'Ivoire** | Firebase dùng tên French |
| `CD` | DR Congo | **Congo - Kinshasa** | Firebase dùng tên khác |
| `CG` | Congo | **Congo - Brazzaville** | Firebase phân biệt 2 Congo |
| `RE` | Reunion | **Réunion** | Dấu tiếng Pháp |
| `CW` | Curacao | **Curaçao** | Dấu tiếng Hà Lan |
| `FK` | Falkland Islands | **Falkland Islands (Islas Malvinas)** | Thêm tên Spanish |
| `MO` | Macau | **Macao** | Spelling khác |
| `WF` | Wallis and Futuna | **Wallis & Futuna** | `&` thay `and` |
| `TC` | Turks and Caicos | **Turks & Caicos Islands** | `&` + thêm "Islands" |

## Các code có trong AdMob nhưng KHÔNG có trong Firebase

| Code | Country | Lý do |
|------|---------|-------|
| `ZZ` | Unknown | Placeholder cho traffic không xác định |
| `SJ` | Svalbard & Jan Mayen | Territory nhỏ |
| `AQ` | Antarctica | Không có dân |
| `IO` | British Indian Ocean Territory | Military base |
| `CC` | Cocos Islands | Dân rất ít |

## Countries có trong Firebase nhưng KHÔNG có trong AdMob (mẫu hiện tại)

Đây có thể chỉ là do không có traffic từ các quốc gia này trong khoảng thời gian query.

## Cách sử dụng `dim_country`

### Query 1: Join Firebase geo với AdMob revenue

```sql
SELECT 
    c.country_name,
    c.tier,
    SUM(g.dau) AS dau,
    SUM(r.total_revenue) AS revenue
FROM silver.geo g
LEFT JOIN silver.dim_country c 
    ON g.country = c.country_name_firebase  -- Firebase dùng tên đầy đủ
LEFT JOIN silver.daily_app_revenue r 
    ON c.country_code = r.country           -- AdMob dùng ISO code
    AND r.date = g.event_date
WHERE g.app_id = 'ar_tracer_trace_drawing_ios'
GROUP BY c.country_name, c.tier
ORDER BY revenue DESC;
```

### Query 2: Filter by Tier

```sql
SELECT country_name, region, tier
FROM silver.dim_country
WHERE tier = 'T1'
ORDER BY country_name;
```

### Query 3: Revenue by Region

```sql
SELECT 
    c.region,
    COUNT(DISTINCT c.country_code) AS countries,
    SUM(r.total_revenue) AS revenue
FROM silver.daily_app_revenue r
LEFT JOIN silver.dim_country c ON r.country = c.country_code
WHERE r.date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY c.region
ORDER BY revenue DESC;
```

## Superset Configuration

### Ad-hoc Filter: Country

Tạo filter dựa trên `dim_country.country_name`:

```yaml
Dataset: dim_country
Filter Column: country_name
Filter Type: Multi-select
Default: (All)
```

### Ad-hoc Filter: Region

```yaml
Dataset: dim_country
Filter Column: region
Filter Type: Multi-select
Options: APAC, EMEA, LATAM, NA, AFRICA
```

### Ad-hoc Filter: Tier

```yaml
Dataset: dim_country
Filter Column: tier
Filter Type: Multi-select
Options: T1, T2, T3
```

## Next Steps

1. **Run seed SQL**: Execute `dim_country_seed.sql` trong StarRocks
2. **Verify mapping**: Kiểm tra các country từ Firebase có match không
3. **Update queries**: Cập nhật các dashboard queries để dùng `dim_country`
4. **Test Superset filters**: Tạo filters trong Superset
