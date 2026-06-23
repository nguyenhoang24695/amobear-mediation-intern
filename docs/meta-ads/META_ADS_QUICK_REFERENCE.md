# Meta Marketing API - Quick Reference Card

## 🔗 Base URL
```
https://graph.facebook.com/v24.0
```

> **v24.0 Released**: October 8, 2025  
> **Key Changes**: Legacy ASC/AAC deprecated, Advantage+ required, lookalike_spec mandatory from Jan 2026

---

## 🔐 Authentication

### Token Types
| Type | Duration | Use Case |
|------|----------|----------|
| Short-lived | 1-2 hours | Testing |
| Long-lived | ~60 days | Development |
| System User | Never expires | **Production** ✅ |

### Required Permissions
```
ads_read            → Read campaign data
ads_management      → Create/edit campaigns (requires Advanced Access)
business_management → Multi-account access
```

---

## 📊 Campaign Objectives (ODAX 2025)

| Objective | API Value | Use Case |
|-----------|-----------|----------|
| Awareness | `OUTCOME_AWARENESS` | Brand reach |
| Traffic | `OUTCOME_TRAFFIC` | Website clicks |
| Engagement | `OUTCOME_ENGAGEMENT` | Post interactions |
| Leads | `OUTCOME_LEADS` | Lead forms |
| **App Promotion** | `OUTCOME_APP_PROMOTION` | **App installs** |
| Sales | `OUTCOME_SALES` | Conversions |

> ⚠️ Legacy objectives (APP_INSTALLS, CONVERSIONS) deprecated Q1 2026

---

## 🚀 Quick API Calls

### List Campaigns
```bash
GET /act_{account_id}/campaigns
  ?fields=id,name,objective,status,daily_budget
  &limit=100
```

### Create Campaign
```bash
POST /act_{account_id}/campaigns
{
  "name": "My Campaign",
  "objective": "OUTCOME_APP_PROMOTION",
  "status": "PAUSED",
  "special_ad_categories": [],
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP"
}
```

### Create Ad Set
```bash
POST /act_{account_id}/adsets
{
  "name": "VN - Android - 18-45",
  "campaign_id": "{campaign_id}",
  "status": "PAUSED",
  "daily_budget": 2000000,
  "billing_event": "IMPRESSIONS",
  "optimization_goal": "APP_INSTALLS",
  "targeting": {
    "geo_locations": {"countries": ["VN"]},
    "age_min": 18, "age_max": 45,
    "device_platforms": ["mobile"],
    "user_os": ["Android"]
  },
  "promoted_object": {
    "application_id": "{app_id}",
    "object_store_url": "https://play.google.com/..."
  }
}
```

### Get Insights
```bash
GET /{object_id}/insights
  ?fields=impressions,clicks,spend,actions,cost_per_action_type
  &date_preset=last_7d
```

---

## 📈 Key Insights Fields

### Basic Metrics
```
impressions, reach, clicks, spend, cpc, cpm, ctr, frequency
```

### Actions (Conversions)
```
actions, action_values, cost_per_action_type
mobile_app_install, cost_per_mobile_app_install
```

### Video Metrics
```
video_p25_watched_actions
video_p50_watched_actions
video_p75_watched_actions
video_p100_watched_actions
```

---

## 📅 Date Presets

```
today, yesterday, last_3d, last_7d, last_14d
last_28d, last_30d, last_90d
this_month, last_month
this_quarter, last_quarter
this_year, last_year
maximum
```

### Custom Date Range
```bash
&time_range={"since":"2025-01-01","until":"2025-01-31"}
```

---

## 🔍 Breakdowns

| Breakdown | Max Historical |
|-----------|----------------|
| `age`, `gender` | 13 months (with reach) |
| `country` | 13 months (with reach) |
| `publisher_platform` | Full |
| `platform_position` | Full |
| `device_platform` | 13 months |
| `frequency_value` | **6 months only** |

### Usage
```bash
&breakdowns=age,gender
&breakdowns=publisher_platform,platform_position
```

---

## 💰 Budget & Bid Values

> **All monetary values in cents!**

| USD | API Value |
|-----|-----------|
| $50 | 5000000 |
| $100 | 10000000 |
| $500 | 50000000 |

### Bid Strategies
```
LOWEST_COST_WITHOUT_CAP (recommended)
LOWEST_COST_WITH_BID_CAP
COST_CAP
LOWEST_COST_WITH_MIN_ROAS
```

---

## ⚠️ Rate Limits

### Headers to Monitor
```
x-business-use-case-usage
x-app-usage
x-ad-account-usage
```

### Error Codes
| Code | Meaning |
|------|---------|
| 4 | Rate limit reached |
| 17 | User request limit |
| 613 | Too many calls |
| 80004 | Quota exceeded |
| 100 | Invalid parameter |
| 190 | Token expired |

### Best Practices
- Use batch requests (max 50 per batch)
- Implement exponential backoff
- Only request needed fields
- Cache token info

---

## 🔄 Status Values

### Campaign/Ad Set/Ad Status
```
ACTIVE    → Running
PAUSED    → Manually paused
DELETED   → Deleted
ARCHIVED  → Archived
```

### Effective Status
```
ACTIVE
PAUSED
DELETED
PENDING_REVIEW
DISAPPROVED
PREAPPROVED
PENDING_BILLING_INFO
CAMPAIGN_PAUSED
ADSET_PAUSED
IN_PROCESS
WITH_ISSUES
```

---

## 🎯 Targeting Specs

### Basic
```json
{
  "geo_locations": {"countries": ["VN"]},
  "age_min": 18,
  "age_max": 45,
  "genders": [0],
  "device_platforms": ["mobile"],
  "user_os": ["Android"]
}
```

### Placements
```json
{
  "publisher_platforms": ["facebook", "instagram", "audience_network"],
  "facebook_positions": ["feed", "stories", "reels"],
  "instagram_positions": ["stream", "story", "reels"]
}
```

### Interest Targeting
```json
{
  "flexible_spec": [{
    "interests": [
      {"id": "6003139266461", "name": "Mobile games"}
    ]
  }]
}
```

---

## 📞 Common Error Solutions

| Error | Solution |
|-------|----------|
| Token expired | Refresh or exchange token |
| Permission denied | Check ads_management scope |
| Invalid parameter | Verify field names and values |
| Rate limited | Implement backoff, reduce calls |
| Account disabled | Contact Meta support |

---

## 📚 Quick Links

- [API Explorer](https://developers.facebook.com/tools/explorer/)
- [Documentation](https://developers.facebook.com/docs/marketing-api)
- [Changelog](https://developers.facebook.com/docs/graph-api/changelog)
- [Rate Limits](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting)

---

*Quick Reference v1.0 | API Version: v24.0 | Updated: Feb 2025*
