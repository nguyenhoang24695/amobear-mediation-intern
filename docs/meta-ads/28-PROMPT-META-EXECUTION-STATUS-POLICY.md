# Prompt - Meta Ads Execution Status Policy: Campaign PAUSED, AdSet/Ad ACTIVE

## Summary

Thay doi policy khi execute Meta campaign request:

- Chi **Campaign** duoc tao voi `status = PAUSED`.
- Tat ca object phia duoi gom **Ad Set** va **Ad** duoc tao voi `status = ACTIVE`.
- Muc tieu: campaign van khong chay ngay sau execute, nhung khi user vao Meta Ads Manager resume campaign thi toan bo ad set/ad ben duoi da san sang chay, khong can bat tung object con.

Khong doi flow approval, khong doi UI create request, khong doi asset preparation, khong doi parallel creation logic ngoai payload status.

## Background

Hien tai execution co the dang set `PAUSED` cho nhieu object de dam bao an toan. Nghiep vu moi muon:

- Execute request chi tao object tren Meta.
- Campaign sau khi tao van o trang thai `PAUSED`.
- Ad set/ad ben duoi phai la `ACTIVE`.
- Khi campaign duoc resume tren Meta, campaign co the chay ngay neu budget/schedule/creative hop le.

## Scope

### Backend

Tim va sua logic tao Meta objects trong execution service, uu tien cac file lien quan:

- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
- Cac helper/payload builder lien quan den:
  - campaign create payload
  - ad set create payload
  - creative/ad create payload
  - parallel ad creation neu co

Yeu cau cu the:

1. Campaign create payload:
   - Luon gui:
     ```json
     "status": "PAUSED"
     ```
   - Khong lay status campaign tu draft payload neu draft co field status khac.
   - Khong tao campaign o `ACTIVE`.

2. Ad Set create payload:
   - Gui:
     ```json
     "status": "ACTIVE"
     ```
   - Neu code hien tai dang dung `PAUSED`, doi sang `ACTIVE`.
   - Neu dang khong gui status, them ro `ACTIVE` de tranh default khong mong muon.

3. Ad create payload:
   - Gui:
     ```json
     "status": "ACTIVE"
     ```
   - Ap dung cho moi variation/ad trong flow single variant va multi-variant/parallel creation.
   - Neu co retry/duplicate/orphan recovery path reuse payload cu, dam bao ad moi tao van `ACTIVE`.

4. Khong doi status cua creative:
   - Creative khong can `status`.
   - Khong them field khong duoc Meta API ho tro.

5. Khong doi execute lifecycle noi bo:
   - Request van chuyen `executing` -> `completed` nhu hien tai.
   - Created objects van duoc ghi log/tracking nhu hien tai.
   - Khong tu goi API resume campaign.
   - Khong tu bat/tat object sau khi tao.

## Important Rules

- Campaign la object duy nhat duoc tao o `PAUSED`.
- Ad Set va Ad phai tao o `ACTIVE`.
- Khong de UI/draft payload override policy nay.
- Khong thay doi approval permission, asset preparation gate, validation, hoac campaign duplication logic ngoai phan status payload.
- Neu co feature flag/status config cu, policy moi phai la default.
- Neu co test snapshot/debug log payload, cap nhat expected status tuong ung.

## Tests

### Backend tests

Them hoac cap nhat test trong project test phu hop, vi du:

- `backend/MediationPro.Infrastructure.Tests`
- `backend/MediationPro.Api.Tests`
- hoac test hien co cho `MetaCampaignExecutionService`

Test cases bat buoc:

1. **Campaign created as PAUSED**
   - Execute request.
   - Assert payload gui toi Meta campaign create endpoint co:
     ```json
     "status": "PAUSED"
     ```

2. **Ad Set created as ACTIVE**
   - Assert payload gui toi ad set create endpoint co:
     ```json
     "status": "ACTIVE"
     ```

3. **Ad created as ACTIVE**
   - Assert payload gui toi ad create endpoint co:
     ```json
     "status": "ACTIVE"
     ```

4. **Multi-variant / parallel ads**
   - Voi request co nhieu ad variants, moi ad create payload deu co:
     ```json
     "status": "ACTIVE"
     ```
   - Campaign van chi `PAUSED`.

5. **Draft payload cannot override execution status policy**
   - Neu DTO/draft co status hoac legacy field khac, execution van force:
     - Campaign `PAUSED`
     - Ad Set `ACTIVE`
     - Ad `ACTIVE`

## Manual Verification

Sau khi deploy len dev:

1. Tao Meta campaign request binh thuong.
2. Submit/approve.
3. Execute request.
4. Mo Meta Ads Manager kiem tra:
   - Campaign: `Paused`
   - Ad Set: `Active`
   - Ads: `Active`
5. Resume campaign tren Meta:
   - Ad set/ad khong can bat lai thu cong.
   - Campaign bat dau eligible delivery neu cac dieu kien khac hop le.

## Validation Commands

Neu khong bi khoa DLL boi `dotnet watch`:

```powershell
dotnet build backend/MediationPro.Api/MediationPro.Api.csproj
dotnet test backend/MediationPro.Api.Tests/MediationPro.Api.Tests.csproj -v minimal
```

Neu dang chay `dotnet watch`, khong kill process cua user. Co the dung output path rieng hoac bao ro caveat.

## Out of Scope

- Khong doi UI create/edit request.
- Khong doi validation required fields.
- Khong doi asset preparation truoc execute.
- Khong doi approval/reject/retry permission.
- Khong them auto-resume campaign.
- Khong goi API update status sau create tru khi flow hien tai bat buoc; uu tien set status ngay trong create payload.
- Khong doi campaign duplicate/recovery behavior ngoai viec dam bao object moi tao dung status policy.

## Assumptions

- Meta cho phep tao Ad Set va Ad o `ACTIVE` trong khi parent Campaign dang `PAUSED`.
- Campaign `PAUSED` du de ngan delivery ngay sau execute.
- Khi user resume campaign tren Meta Ads Manager, cac Ad Set/Ad dang `ACTIVE` se san sang chay ma khong can thao tac bat tung object con.
