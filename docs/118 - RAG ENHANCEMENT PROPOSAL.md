# 116 — RAG Enhancement: Nâng cấp trí tuệ cho AI Platform

> **Module:** Mediation Pro — Retrieval-Augmented Generation  
> **Mục tiêu:** Chuyển từ keyword search sang semantic understanding  
> **Stack:** pgvector + Embedding APIs + .NET Core 8  
> **Reference:** 114 (AI SQL Assistant v1.4), 115 (Insight & Alert), 111 (StarRocks Metrics)  
> **Version:** 1.0 — 2026-03-13

---

## Mục lục

1. Tại sao cần RAG — Giới hạn hệ thống hiện tại
2. RAG Architecture cho Mediation Pro
3. Phase 1 — Hybrid Search (KB Enhancement)
4. Phase 2 — Document RAG (Internal Docs Index)
5. Phase 3 — Contextual RAG (Multi-source Intelligence)
6. Embedding Strategy
7. Integration với hệ thống hiện có
8. Phân kỳ triển khai
9. Chi phí & ROI
10. Rủi ro

---

## 1. Tại sao cần RAG — Giới hạn hệ thống hiện tại

### 1.1 Hệ thống KB hiện tại (doc 114 §5)

```mermaid
flowchart LR
    Q["DA hỏi:<br/>'Tại sao user bỏ game?'"]
    FTS["Full-text Search<br/>PostgreSQL tsvector"]
    MATCH["Keywords: 'user', 'bỏ', 'game'"]
    KB["KB entries:<br/>❌ 'drop_rate formula' — không match<br/>❌ 'Level optimization' — không match<br/>⚠️ 'User engagement' — weak match"]
    RESULT["Kết quả: 0-1 entry relevant<br/>AI thiếu context → trả lời generic"]

    Q --> FTS --> MATCH --> KB --> RESULT

    style RESULT fill:#ffcdd2
```

**Vấn đề cốt lõi:** Full-text search match **từ khóa**, không match **ý nghĩa**.

| DA hỏi | KB entry liên quan | Full-text match? | Semantic match? |
|---|---|---|---|
| "Tại sao user bỏ game?" | "drop_rate formula" | ❌ Không match | ✅ Liên quan trực tiếp |
| "App đang hoạt động tốt không?" | "Health score calculation" | ❌ Không match | ✅ Chính xác |
| "Tối ưu quảng cáo thế nào?" | "Waterfall optimization best practice" | ⚠️ Weak | ✅ Perfect match |
| "Revenue giảm do đâu?" | "Double-counting warning AppLovin/AdMob" | ❌ Không match | ✅ Có thể liên quan |

### 1.2 Scoring hiện tại vs RAG

```
Hiện tại:
Score = text_search_rank × tag_boost × focus_boost × priority

Với RAG:
Score = MAX(text_search_rank, vector_similarity) × tag_boost × focus_boost × priority
         ↑                      ↑
    Keyword match         Semantic match (NEW)
```

RAG không **thay thế** full-text search — nó **bổ sung** 1 signal mới (vector similarity). Hệ thống scoring hiện tại (tag_boost, focus_boost, priority, budget packing) giữ nguyên 100%.

---

## 2. RAG Architecture cho Mediation Pro

### 2.1 Tổng quan 3 Phases

```mermaid
flowchart TB
    subgraph P1["🟢 PHASE 1 — Hybrid Search (2-3 tuần)"]
        P1A["pgvector trên PostgreSQL"]
        P1B["Embed KB entries (95+ entries)"]
        P1C["Hybrid: full-text + vector search"]
        P1D["→ KB accuracy tăng 30-40%"]
    end

    subgraph P2["🟡 PHASE 2 — Document RAG (3-4 tuần)"]
        P2A["Index tài liệu nội bộ:<br/>doc 99, 111, 100, runbooks"]
        P2B["Chunking + embedding"]
        P2C["DA hỏi bất kỳ điều gì<br/>về hệ thống → AI tìm đúng đoạn"]
        P2D["→ AI hiểu platform sâu hơn"]
    end

    subgraph P3["🔴 PHASE 3 — Contextual RAG (4-6 tuần)"]
        P3A["Index: Daily Insights history"]
        P3B["Index: Alert history + resolutions"]
        P3C["Index: Approved queries + patterns"]
        P3D["AI 'nhớ' kinh nghiệm<br/>từ toàn bộ team"]
        P3E["→ Institutional knowledge engine"]
    end

    P1 --> P2 --> P3

    style P1 fill:#e8f5e9
    style P2 fill:#fff3e0
    style P3 fill:#fce4ec
```

### 2.2 Architecture Overview

```mermaid
flowchart TB
    subgraph Sources["📚 CONTENT SOURCES"]
        S1["KB Entries (95+)"]
        S2["Internal Docs (99, 111, 100...)"]
        S3["Daily Insights (historical)"]
        S4["Alert History + Resolutions"]
        S5["Approved Queries + Patterns"]
        S6["Metrics Catalog (238 metrics)"]
    end

    subgraph Embedding["🔄 EMBEDDING PIPELINE"]
        E1["Chunking<br/>(split long content)"]
        E2["Embedding API<br/>(OpenAI / Gemini)"]
        E3["Store vectors<br/>pgvector"]
    end

    subgraph Search["🔍 HYBRID SEARCH"]
        H1["Full-text Search<br/>(PostgreSQL tsvector)"]
        H2["Vector Search<br/>(pgvector cosine similarity)"]
        H3["Score Fusion<br/>MAX(text_rank, vector_sim)<br/>× existing boosts"]
    end

    subgraph Prompt["📝 CRAFT PROMPT BUILDER"]
        P1["Layer 1: Role Prompt"]
        P2["Layer 2: Context + Pinned"]
        P3["Layer 3: RAG Results (hybrid)"]
    end

    Sources --> Embedding --> Search
    Search --> Prompt

    style Sources fill:#e3f2fd
    style Embedding fill:#fff3e0
    style Search fill:#e8f5e9
    style Prompt fill:#f3e5f5
```

---

## 3. Phase 1 — Hybrid Search (KB Enhancement)

### 3.1 Mục tiêu

Nâng cấp KB search từ **keyword-only** sang **keyword + semantic**, không thay đổi bất kỳ component nào khác.

### 3.2 Thay đổi kỹ thuật

```mermaid
flowchart TB
    subgraph Before["TRƯỚC (doc 114 §5)"]
        B1["DA hỏi → Extract keywords"]
        B2["Full-text search tsvector"]
        B3["Score + rank + budget"]
        B4["Inject vào prompt"]
    end

    subgraph After["SAU (Phase 1 RAG)"]
        A1["DA hỏi → Extract keywords + Embed question"]
        A2a["Channel A: Full-text search tsvector"]
        A2b["Channel B: Vector similarity (pgvector)"]
        A3["Merge: deduplicate + MAX score"]
        A4["Apply existing boosts (tag, focus, priority)"]
        A5["Budget pack + Inject vào prompt"]
    end

    style After fill:#e8f5e9
```

### 3.3 Luồng chi tiết

```mermaid
sequenceDiagram
    participant DA as DA hỏi
    participant API as Backend
    participant EMB as Embedding API
    participant PG as PostgreSQL (KB + pgvector)
    participant PROMPT as CRAFT Builder

    DA->>API: "Tại sao user bỏ game?"

    par Full-text (existing)
        API->>PG: tsvector search "user bỏ game"
        PG-->>API: 8 candidates (text_rank scores)
    and Vector (NEW)
        API->>EMB: Embed("Tại sao user bỏ game?")
        EMB-->>API: vector [0.12, -0.34, ...]
        API->>PG: SELECT *, 1 - (embedding <=> $query_vec) AS vector_sim<br/>FROM ai_knowledge_base<br/>ORDER BY embedding <=> $query_vec<br/>LIMIT 15
        PG-->>API: 15 candidates (vector_sim scores)
    end

    API->>API: Merge & deduplicate (23 → 18 unique)
    API->>API: Combined_score = MAX(text_rank, vector_sim)
    API->>API: Final_score = combined × tag_boost × focus_boost × priority/10
    API->>API: Sort + budget pack (4000 tokens)

    Note over API: Phase 1 results vs old:<br/>✅ "drop_rate formula" found (vector: 0.82 sim)<br/>✅ "Level optimization" found (vector: 0.78 sim)<br/>❌ Previously missed by keyword search

    API->>PROMPT: Inject top entries vào Layer 3
```

### 3.4 Gợi ý kỹ thuật

**PostgreSQL pgvector setup:**

```sql
-- Bật extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Thêm cột embedding vào bảng KB hiện có
ALTER TABLE ai_knowledge_base 
ADD COLUMN embedding vector(1536);  -- 1536 for OpenAI text-embedding-3-small

-- Index cho fast similarity search
CREATE INDEX idx_kb_embedding ON ai_knowledge_base 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
-- lists = sqrt(row_count), ~10 cho ~95 entries, tăng khi KB lớn hơn
```

**Embedding khi nào:**
- Khi admin tạo/sửa KB entry → gọi Embedding API → lưu vector
- Batch job: embed toàn bộ entries chưa có vector (migration lần đầu)
- Question embedding: mỗi lần DA hỏi, embed câu hỏi real-time (~50ms)

**Score fusion (trong KnowledgeBaseService):**

```
// Pseudo-code
var textResults = await FullTextSearch(question, limit: 20);
var vectorResults = await VectorSearch(questionEmbedding, limit: 15);

var merged = MergeAndDeduplicate(textResults, vectorResults);

foreach (entry in merged)
{
    entry.CombinedScore = Math.Max(
        entry.TextRank ?? 0,
        entry.VectorSimilarity ?? 0
    );
    
    // Áp dụng existing boosts (unchanged)
    entry.FinalScore = entry.CombinedScore
        * TagBoost(entry, questionKeywords)
        * FocusBoost(entry, contextFocusAreas)
        * (entry.Priority / 10.0);
}

return BudgetPack(merged.OrderByDescending(e => e.FinalScore), tokenBudget: 4000);
```

### 3.5 Impact Assessment

| Metric | Trước (keyword) | Sau (hybrid) | Cải thiện |
|---|---|---|---|
| KB search relevance | ~60% queries có ≥1 relevant entry | ~85-90% | +30-40% |
| "Câu hỏi mơ hồ" match | Gần như 0% | ~70% | Significant |
| Vietnamese question match | Kém (tsvector yếu với tiếng Việt) | Tốt (embedding hiểu semantic) | Major |
| Latency per search | ~5ms | ~55ms (+50ms embedding call) | Acceptable |
| Token cost per search | $0 | ~$0.00002 (embedding) | Negligible |

---

## 4. Phase 2 — Document RAG (Internal Docs Index)

### 4.1 Mục tiêu

Index toàn bộ tài liệu nội bộ Amobear để AI có thể trả lời bất kỳ câu hỏi nào về hệ thống.

### 4.2 Document Sources

| Document | Nội dung | Size ~est | Chunks ~est |
|---|---|---|---|
| **Doc 99** | Mediation Pro Platform (architecture, flow, schedule) | ~50K tokens | ~100 chunks |
| **Doc 111** | StarRocks Views & Metrics (schema, queries, best practices) | ~40K tokens | ~80 chunks |
| **Doc 100** | Data Storage Architecture (DDL, table relationships) | ~30K tokens | ~60 chunks |
| **Doc 114** | AI SQL Assistant (CRAFT, KB, contexts, API) | ~40K tokens | ~80 chunks |
| **Doc 115** | AI Insight & Alert Builder | ~15K tokens | ~30 chunks |
| **Runbooks** | Operational procedures, troubleshooting | Variable | Variable |
| **Total** | | ~175K tokens | ~350 chunks |

### 4.3 Chunking Strategy

```mermaid
flowchart TB
    subgraph Doc["📄 Document"]
        D1["# Section 1<br/>Content...<br/><br/>## Subsection 1.1<br/>Content...<br/><br/>## Subsection 1.2<br/>Content..."]
    end

    subgraph Chunking["✂️ CHUNKING RULES"]
        C1["Split by ## headers (semantic boundaries)"]
        C2["Max chunk: 800 tokens"]
        C3["Overlap: 100 tokens between chunks"]
        C4["Preserve: code blocks, tables as single unit"]
        C5["Metadata per chunk:<br/>doc_id, section, subsection, page"]
    end

    subgraph Store["💾 STORAGE"]
        S1["rag_documents — document metadata"]
        S2["rag_chunks — chunks + embeddings"]
    end

    Doc --> Chunking --> Store

    style Chunking fill:#fff3e0
```

### 4.4 Gợi ý Database

```sql
-- Document registry
CREATE TABLE rag_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_key         VARCHAR(50) UNIQUE NOT NULL,   -- 'doc_99', 'doc_111'
    title           VARCHAR(200) NOT NULL,
    source_path     TEXT,                           -- file path or URL
    total_chunks    INT DEFAULT 0,
    total_tokens    INT DEFAULT 0,
    last_indexed_at TIMESTAMPTZ,
    version         INT DEFAULT 1,
    is_active       BOOLEAN DEFAULT true
);

-- Document chunks with embeddings
CREATE TABLE rag_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES rag_documents(id),
    chunk_index     INT NOT NULL,
    section_title   VARCHAR(200),
    content         TEXT NOT NULL,
    token_count     INT NOT NULL,
    embedding       vector(1536),
    metadata        JSONB DEFAULT '{}',            -- {section, subsection, has_code, has_table}
    
    UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_rag_chunks_embedding ON rag_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);
```

### 4.5 Search Integration

Khi DA hỏi, search 3 channels song song:

```mermaid
flowchart LR
    Q["DA question"]
    
    CH1["Channel 1:<br/>KB Full-text<br/>(existing)"]
    CH2["Channel 2:<br/>KB Vector<br/>(Phase 1)"]
    CH3["Channel 3:<br/>Doc RAG Vector<br/>(Phase 2 — NEW)"]
    
    MERGE["Merge + Score<br/>+ Budget Pack"]
    
    PROMPT["Inject vào<br/>CRAFT Layer 3"]

    Q --> CH1 & CH2 & CH3 --> MERGE --> PROMPT

    style CH3 fill:#fff3e0
```

**Budget allocation (4000 tokens total):**

| Source | Budget share | Rationale |
|---|---|---|
| KB entries (hybrid) | 2500 tokens | Business rules, metrics — highest priority |
| Doc RAG chunks | 1500 tokens | System knowledge — supplementary |

> KB entries luôn ưu tiên hơn doc chunks vì KB được curate bởi admin (higher signal-to-noise).

### 4.6 Ví dụ thực tế

DA hỏi: *"Pipeline chạy lúc mấy giờ? Nếu data T-1 chưa có thì làm sao?"*

| Source | Result |
|---|---|
| KB full-text | ❌ Không tìm thấy (KB không chứa schedule info) |
| KB vector | ❌ Không tìm thấy |
| **Doc RAG** | ✅ Doc 99 §17.1: "Daily Pipeline 04:00 UTC" + §17.4: "Retry strategy: 5min → 15min → 30min → CRITICAL alert" |

→ AI trả lời chính xác với reference từ tài liệu hệ thống.

### 4.7 Document Update Flow

```mermaid
flowchart LR
    UPDATE["Admin upload<br/>doc mới / updated"]
    CHUNK["Re-chunk<br/>entire document"]
    EMBED["Re-embed<br/>all chunks"]
    REPLACE["Replace old chunks<br/>in DB (atomic)"]
    VERSION["Increment<br/>doc version"]

    UPDATE --> CHUNK --> EMBED --> REPLACE --> VERSION
```

Admin upload qua UI (Markdown file) hoặc auto-sync từ Git repository.

---

## 5. Phase 3 — Contextual RAG (Multi-source Intelligence)

### 5.1 Mục tiêu

AI không chỉ hiểu "kiến thức tĩnh" (KB + docs) mà còn hiểu **kinh nghiệm tích lũy** từ toàn bộ team qua thời gian.

### 5.2 New Data Sources

```mermaid
flowchart TB
    subgraph NewSources["🧠 CONTEXTUAL DATA SOURCES"]
        S1["📊 Daily Insights (doc 115)<br/>History of AI-generated insights<br/>per app per date"]
        S2["🔔 Alert History<br/>What triggered, how resolved,<br/>root cause analysis"]
        S3["✅ Approved Queries<br/>DA-confirmed correct queries<br/>(from feedback system)"]
        S4["💬 High-rated Conversations<br/>Conversations rated 5/5<br/>by users"]
    end

    subgraph Value["💡 VALUE"]
        V1["AI 'nhớ' rằng tuần trước<br/>puzzle_blast cũng có eCPM drop<br/>và đã resolve bằng cách X"]
        V2["AI suggest solution dựa trên<br/>cách team đã giải quyết<br/>vấn đề tương tự trước đó"]
        V3["Institutional knowledge<br/>không mất khi người rời team"]
    end

    NewSources --> Value

    style NewSources fill:#e3f2fd
    style Value fill:#e8f5e9
```

### 5.3 Insight History RAG

Mỗi Daily Insight (doc 115) sau khi generate sẽ được **embed và index**:

```mermaid
flowchart LR
    GEN["Insight generated<br/>for puzzle_blast<br/>2026-03-11"]
    CHUNK["Chunk by section<br/>(revenue, engagement,<br/>anomalies, recommendations)"]
    EMBED["Embed each section"]
    STORE["Store in rag_chunks<br/>doc_type: 'insight'<br/>app_id: 'puzzle_blast'<br/>date: '2026-03-11'"]

    GEN --> CHUNK --> EMBED --> STORE
```

**Use case:** DA hỏi "puzzle_blast gần đây có vấn đề gì không?" → RAG tìm insights 7-14 ngày gần nhất → AI tổng hợp trend, so sánh, đưa nhận định dựa trên chuỗi insights liên tục.

### 5.4 Alert Resolution RAG

Khi user resolve alert (acknowledge + note lý do), resolution note được embed:

```
Alert: eCPM puzzle_blast giảm 22% (2026-03-05)
Resolution by: Nguyễn A
Note: "Do AdMob network bid giảm seasonal. Đã giảm floor 10%, 
eCPM recover sau 2 ngày. Không cần action thêm."
```

**Use case:** Lần sau eCPM giảm tương tự, AI tìm resolution cũ → suggest: *"Lần trước eCPM giảm tương tự (03/05), team đã giảm floor 10% và recover sau 2 ngày. Bạn có muốn áp dụng tương tự?"*

### 5.5 Approved Query Patterns RAG

Queries mà DA confirm "correct" (thumbs up) được embed:

```
Question: "Top 10 levels có drop rate cao nhất cho puzzle_blast"
SQL: SELECT level_id, ROUND(drop_rate, 1)...
Rating: ★★★★★ by 3 users
```

**Use case:** User mới hỏi tương tự → RAG tìm approved query → AI dùng làm template thay vì generate from scratch → accuracy cao hơn.

---

## 6. Embedding Strategy

### 6.1 Model Selection

| Model | Dimensions | Cost/1M tokens | Quality | Recommendation |
|---|---|---|---|---|
| OpenAI `text-embedding-3-small` | 1536 | $0.02 | Good | ✅ **Default** — balance cost/quality |
| OpenAI `text-embedding-3-large` | 3072 | $0.13 | Excellent | For critical use cases |
| Gemini `text-embedding-004` | 768 | Free (limited) | Good | Backup / cost savings |

### 6.2 Khi nào embed

| Trigger | What gets embedded | Frequency |
|---|---|---|
| KB entry created/updated | Entry content | On change |
| Document indexed/updated | All chunks | On upload |
| Daily Insight generated | Insight sections | Daily (after pipeline) |
| Alert resolved with note | Resolution note | On resolution |
| Query rated ★★★★★ | Question + SQL | On rating |
| DA question asked | Question text | Real-time per request |

### 6.3 Embedding Cost Estimate

| Source | Items | Avg tokens | Total tokens | Cost (OpenAI small) |
|---|---|---|---|---|
| KB entries | 95 | 300 | 28,500 | $0.0006 |
| Internal docs (one-time) | 350 chunks | 500 | 175,000 | $0.0035 |
| Daily insights (per day) | 50 apps × 7 sections | 200 | 70,000 | $0.0014 |
| Questions (per day) | 200 questions | 50 | 10,000 | $0.0002 |
| **Daily running cost** | | | ~80,000 | **$0.0016/day** |
| **Monthly running cost** | | | ~2.4M | **~$0.05/month** |

> 💡 Embedding cost gần như **zero** — $0.05/tháng. ROI cực cao so với cải thiện search quality.

---

## 7. Integration với hệ thống hiện có

### 7.1 Thay đổi tối thiểu

```mermaid
flowchart TB
    subgraph Unchanged["♻️ KHÔNG THAY ĐỔI"]
        U1["CRAFT Prompt Builder structure"]
        U2["3-Layer Architecture"]
        U3["Scoring formula (tag, focus, priority)"]
        U4["Budget packing logic"]
        U5["Pinned Metrics (always inject)"]
        U6["Role Prompts"]
        U7["Context isolation"]
        U8["SQL Validator + Executor"]
    end

    subgraph Changed["🔄 THAY ĐỔI"]
        C1["KnowledgeBaseService.SearchAndScoreAsync<br/>→ Thêm vector search channel<br/>→ Merge scores"]
        C2["ai_knowledge_base table<br/>→ Thêm cột 'embedding vector(1536)'"]
        C3["New: rag_documents + rag_chunks tables"]
        C4["New: EmbeddingService<br/>(call OpenAI/Gemini embedding API)"]
        C5["New: DocumentIndexer<br/>(chunk + embed documents)"]
    end

    style Unchanged fill:#e8f5e9
    style Changed fill:#fff3e0
```

### 7.2 Service Layer Changes

| Service | Change | Impact |
|---|---|---|
| `KnowledgeBaseService` | Add vector search parallel channel + score fusion | Medium — core change |
| `EmbeddingService` (NEW) | Wrap embedding API calls (OpenAI/Gemini) | Low — simple HTTP client |
| `DocumentIndexerService` (NEW) | Chunk markdown → embed → store | Low — batch job |
| `CraftPromptBuilder` | Layer 3 now includes doc RAG results | Low — append to existing |
| `InsightGenerator` (doc 115) | After generate → embed insight sections | Low — append step |
| All others | No change | None |

---

## 8. Phân kỳ triển khai

### 8.1 Roadmap

```mermaid
gantt
    title RAG Enhancement Roadmap
    dateFormat YYYY-MM-DD

    section Phase 1 — Hybrid KB Search (2-3 tuần)
    pgvector extension setup              :p1a, 2026-04-15, 2d
    EmbeddingService (OpenAI adapter)     :p1b, 2026-04-15, 3d
    Embed existing KB entries (batch)     :p1c, after p1b, 1d
    KB migration: add embedding column    :p1d, after p1a, 1d
    Hybrid search in KnowledgeBaseService :p1e, after p1c, 4d
    Score fusion + testing                :p1f, after p1e, 3d
    A/B test: keyword-only vs hybrid      :p1g, after p1f, 3d
    Phase 1 Done                          :milestone, m1, after p1g, 0d

    section Phase 2 — Document RAG (3-4 tuần)
    rag_documents + rag_chunks tables     :p2a, after m1, 2d
    DocumentIndexer (chunk + embed)       :p2b, after p2a, 4d
    Index doc 99, 111, 100, 114, 115      :p2c, after p2b, 2d
    Multi-channel search integration      :p2d, after p2c, 4d
    Budget allocation (KB vs Doc)         :p2e, after p2d, 2d
    Admin UI: Document manager            :p2f, after p2d, 4d
    Phase 2 Done                          :milestone, m2, after p2f, 0d

    section Phase 3 — Contextual RAG (4-6 tuần)
    Insight history indexing pipeline      :p3a, after m2, 4d
    Alert resolution indexing              :p3b, after m2, 3d
    Approved query patterns indexing       :p3c, after p3a, 3d
    Cross-reference search                 :p3d, after p3c, 5d
    "AI remembers" experience flow         :p3e, after p3d, 5d
    Phase 3 Done                           :milestone, m3, after p3e, 0d
```

### 8.2 Checklist

**Phase 1 — Hybrid KB Search (tuần 1-3):**
- [ ] `CREATE EXTENSION vector` trên PostgreSQL
- [ ] `ALTER TABLE ai_knowledge_base ADD COLUMN embedding vector(1536)`
- [ ] `EmbeddingService` — wrapper OpenAI `text-embedding-3-small` API
- [ ] Batch embed 95+ existing KB entries
- [ ] Auto-embed on KB entry create/update (hook in KB admin)
- [ ] `KnowledgeBaseService.SearchAndScoreAsync` — thêm vector search channel
- [ ] Score fusion: `MAX(text_rank, vector_sim) × tag × focus × priority`
- [ ] A/B test: log cả keyword-only results và hybrid results, so sánh relevance

**Phase 2 — Document RAG (tuần 4-7):**
- [ ] `rag_documents` + `rag_chunks` tables
- [ ] `DocumentIndexerService` — chunk markdown by headers, max 800 tokens, 100 overlap
- [ ] Index all internal docs (99, 111, 100, 114, 115)
- [ ] 3-channel search: KB full-text + KB vector + Doc RAG vector
- [ ] Budget allocation: 2500 KB + 1500 Doc
- [ ] Admin UI: upload/re-index documents, view chunks, search preview
- [ ] Auto-reindex khi document version thay đổi

**Phase 3 — Contextual RAG (tuần 8-13):**
- [ ] Hook InsightGenerator → embed insight sections after generation
- [ ] Hook Alert resolution → embed resolution notes
- [ ] Hook query feedback (★★★★★) → embed question + SQL
- [ ] Contextual search: include insight history + resolutions in results
- [ ] "Similar issue in the past" feature — AI references previous resolutions
- [ ] Retention policy: chỉ index insights/alerts/queries trong 90 ngày gần nhất

---

## 9. Chi phí & ROI

### 9.1 Chi phí

| Item | One-time | Monthly | Notes |
|---|---|---|---|
| pgvector extension | $0 | $0 | Free PostgreSQL extension |
| Embed KB entries (95) | $0.001 | ~$0.01 | Negligible |
| Embed docs (350 chunks) | $0.004 | $0 (unless re-index) | One-time |
| Embed questions (200/day) | — | $0.006 | Real-time |
| Embed insights (50 apps × 7/day) | — | $0.04 | Daily batch |
| **Total** | **~$0.005** | **~$0.05** | |

### 9.2 ROI

| Benefit | Estimate |
|---|---|
| KB search relevant rate: 60% → 85% | 40% improvement |
| DA time finding info: 10 min → 2 min | 8 min saved per query |
| "Unanswerable" questions: 30% → 10% | 67% reduction |
| Onboarding new DA: 2 weeks → 3 days | AI knows all docs |
| Institutional knowledge retention | Priceless |

---

## 10. Rủi ro

| Risk | Impact | Mitigation |
|---|---|---|
| Embedding API downtime | Medium | Fallback to keyword-only (graceful degradation) |
| Vector search returns irrelevant | Low | MAX fusion — keyword still works as safety net |
| pgvector performance at scale | Low | ivfflat index, ~350 chunks = trivial for pgvector |
| Stale document index | Medium | Version tracking, admin re-index button |
| Embedding model changes | Low | Re-embed batch job, vectors stored not model-dependent on retrieval |

---

> 📄 **Doc 116 — RAG Enhancement Proposal:**
> - **Phase 1 (2-3 tuần):** pgvector + hybrid KB search. Minimal change, maximum impact. Cost: ~$0.05/month.
> - **Phase 2 (3-4 tuần):** Index 5 internal docs (~350 chunks). AI hiểu toàn bộ platform architecture.
> - **Phase 3 (4-6 tuần):** Index insights, alerts, approved queries. AI trở thành institutional memory.
> - **Total timeline:** 10-13 tuần, có thể chạy **song song** với doc 115 (Insight & Alert).
> - **Nguyên tắc:** RAG bổ sung, không thay thế. Scoring formula, CRAFT, budget packing — tất cả giữ nguyên.
