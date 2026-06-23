"""Classify Amobear apps by category from displayName + appStoreId heuristics."""
import json
import re
from collections import defaultdict
from pathlib import Path

SRC = r"D:\GoogleDrive\nquang85\My Drive\AndroidVN\Amobear\apps.json"
OUT_DIR = Path(r"D:\Git\Amobear\Amobear.Mediation.Tools\docs\plans")

# Category classification rules (priority order — first match wins)
RULES = [
    # AI_CHAT / AI_UTILITY (priority — phải match trước creative_utility)
    ("ai_chat", [
        r"\bAI\s*(chat|companion|girlfriend|boyfriend|character|friend|talk|assist|buddy)",
        r"chatbot", r"chat\s*ai", r"talk\s*to.*ai", r"\bAI\b.*\bchat\b",
    ]),
    ("ai_utility", [
        r"\bAI\s*(art|generator|writer|story|image|photo|enhance|upscal|paraphrase|scan|identif)",
        r"\bAI\b.*(text|content|video|music|song|caption)",
        r"plant\s*(identif|finder|scan)", r"animal\s*(identif|scan)", r"food\s*scan",
        r"text.to.image", r"prompt\s*ai",
    ]),
    # CARD_CASINO (must match before casual_game for solitaire)
    ("card_casino", [
        r"poker", r"casino", r"\bslots?\b", r"\bbingo\b", r"\bblackjack\b",
        r"solitaire", r"hearts\s*card", r"spades\s*card", r"klondike", r"freecell",
        r"\bbaccarat\b", r"roulette", r"\bteenpatti\b", r"rummy",
    ]),
    # HYPER_CASUAL — clicker, runner, idle, simple loop
    ("hyper_casual", [
        r"\bclicker\b", r"runner", r"\b(stack|tap|swipe|tower|jump|dash|fall|fly|slide)\b",
        r"endless\s*(run|game)", r"idle\s*tap", r"\bobby\b", r"parkour",
        r"\bcraft\s*(blox|cube|world)", r"escape\s*(game|jump)",
    ]),
    # MIDCORE_GAME — RPG, strategy, action, battle
    ("midcore_game", [
        r"\bRPG\b", r"\bMMO\b", r"strategy", r"\bhero(es)?\s*(legend|battle|war|saga)",
        r"clash", r"warrior", r"\bquest\b", r"adventure\s*(rpg|quest|game)",
        r"dungeon", r"empire", r"kingdom\s*(rush|defense)",
        r"\bbattle\b", r"\bmonster\s*(evolution|run|battle)", r"gangster",
        r"crime\s*(city|hero)", r"\bcraft\s*adventure", r"shooter\b",
    ]),
    # CASUAL_GAME — match-3, puzzle, word, color, fishing, dress-up
    ("casual_game", [
        r"match[\s-]?3", r"\bpuzzle\b", r"jigsaw", r"crossword", r"word\s*(search|find|game|puzzle|beat)",
        r"sudoku", r"mahjong",
        r"color(ing|ed)?\s*(by\s*number|book|flow)", r"paint\s*by\s*number", r"color\s*flow",
        r"\bmerge\b", r"bubble\s*shoot", r"block\s*(puzzle|master|buster)", r"tile\s*master",
        r"fishing\s*(battle|mega|hook|game)", r"dress\s*up", r"left\s*or\s*right",
        r"ice\s*cream\s*(game|scream)", r"silly\s*sound", r"noisy\s*zoo",
        r"baby\s*game", r"\bcat\b.*game", r"animal\s*game",
        r"bus\s*(sort|away|jam)", r"car\s*(out|jam|parking|sort)", r"parking\s*jam",
        r"sort\s*(jam|color|game)", r"\bsort\b.*game",
        r"makeover", r"asmr\s*(makeover|game)",
    ]),
    # SIMULATION
    ("simulation", [
        r"idle\s*(tycoon|simulator|empire|rich)", r"tycoon", r"farm\s*(simulator|life|town)",
        r"build\s*(city|town|farm)", r"merge\s*(town|city|kingdom)",
        r"\b(life|city|town|farm)\s*simulator\b", r"animal\s*restaurant",
        r"\bsupermarket\s*simulator", r"\b\w+\s*simulator\b",
    ]),
    # CREATIVE_UTILITY — photo/video/face editing, AR, drawing
    ("creative_utility", [
        r"\bAR\b\s*(tracer|drawing|art|cam)", r"\btrace\s*(drawing|to|art)", r"sketch", r"paint(ing)?\s*(app|maker)",
        r"photo\s*(editor|filter|effect|enhanc|art|maker|cleaner)",
        r"video\s*(editor|maker|filter|effect|enhance|cutter|trim)",
        r"camera\s*(effect|filter|app)", r"selfie\s*(camera|cam|filter)", r"beauty\s*(camera|cam)",
        r"sticker\s*maker", r"emoji\s*maker", r"meme\s*(maker|generator)",
        r"avatar\s*(maker|creator)", r"face\s*(swap|filter|app|changer|aging|warp)", r"makeup\s*(camera|app)",
        r"hair\s*(style|color)\s*(app|changer)", r"cartoon|anime\s*(maker|filter|cam)",
        r"background\s*(remover|change|edit)", r"object\s*remover", r"image\s*(eraser|enhance|upscale)",
        r"time\s*warp\s*scan", r"face\s*morph", r"future\s*self",
        r"left\s*or\s*right(?!.*game)",  # creative if not game
        r"collage\s*(maker)", r"album\s*maker",
    ]),
    # ENTERTAINMENT — short drama, video stream, emulator, prank
    ("entertainment", [
        r"short\s*(film|drama|tales|movie|reel)", r"drama\s*(reel|hot|app)",
        r"reels", r"vlog",
        r"\bemulator\b", r"retro\s*game", r"console\s*(retro|emulator)",
        r"prank\s*(call|video|sound|app|airhorn)",
        r"\bjoke(s|r)?\b\s*(app|funny)", r"funny\s*(sound|app|airhorn)",
        r"horror\s*story", r"scary\s*(story|sound)",
    ]),
    # SUBSCRIPTION_CONTENT — VPN, news, education, religion, streaming
    ("subscription_content", [
        r"\bVPN\b", r"\bproxy\s*(server|app)", r"\bnews\b", r"weather\s*(forecast|live|today)",
        r"learn(ing)?\s*(app|english|spanish)", r"language\s*(learn|app)", r"translat(or|ion)",
        r"radio\s*(fm|player|live|station)", r"\bpodcast", r"\bbook(s)?\s*(reader|app|library)",
        r"meditat", r"\byoga\b", r"fitness\s*(coach|plan|premium|app)", r"workout\s*(plan|premium|app)",
        r"diet\s*(plan|app)", r"sleep\s*(track|sound|app)",
        r"\bquran\b", r"\bcor(á|a)n\b", r"\bbible\b", r"\bprayer\b", r"\bazan\b", r"qibla",
        r"holy\s*(quran|book)", r"deeper\s*journey", r"islamic", r"christian",
        r"horoscope", r"\bzodiac\b", r"tarot",
    ]),
    # PRODUCTIVITY — utility tools
    ("productivity", [
        r"\bnote(s|book)?\b", r"reminder", r"todo", r"task\s*manager", r"\bcalendar\b",
        r"scanner", r"\bPDF\b", r"document", r"file\s*(manager|recovery|saver)", r"\bcleaner\b",
        r"recovery\s*(photo|file|video|data)", r"photo\s*recovery", r"data\s*recovery",
        r"battery\s*(saver|optimi|cool)", r"\bRAM\s*(booster|cleaner)", r"phone\s*(clean|booster|cool)",
        r"\bQR\b\s*(code|scan)", r"barcode", r"compass", r"flashlight",
        r"keyboard\s*(app|smart|emoji)", r"launcher\b", r"\bclock\b\s*(widget|app)",
        r"timer", r"stopwatch", r"alarm",
        r"earth\s*(map|live|3d)", r"world\s*(map|view)", r"\bGPS\b", r"navigation\s*app",
        r"speed\s*test", r"network\s*(monitor|test)", r"wifi\s*(analyz|test|password)",
        r"\bcalculator\b", r"unit\s*convert",
        r"\bemail\b", r"mail(box)?\s*(app|client|for)", r"\bmail\s*[-]\s*\w+",
        r"hotmail", r"outlook", r"\bgmail\b",
        r"video\s*(player|saver|downloader|download|format)", r"all\s*video", r"\bmp4\b",
        r"story\s*saver", r"\binsta\s*(saver|download)", r"reels\s*(downloader|saver)",
        r"caller\s*id", r"spam\s*blocker", r"call\s*blocker",
        r"\bbrowser\b", r"\bweb\s*browser", r"web\s*search", r"smart\s*cast", r"screen\s*mirror",
        r"\bremote\s*(control|tv|universal|controller|psremote)",
        r"\bcontroller\s*for\b", r"\bps\s*remote", r"mirror\s*to\s*(tv|pc)",
        r"contact(s)?\s*(backup|app)", r"sms\s*(backup|app)", r"messages\s*[-—]\s*sms",
        r"location\s*(tracker|finder)", r"phone\s*locator", r"find\s*(my|phone)",
        r"\bwifi\b\s*(map|finder|location|password|analyz)", r"hotspot",
        r"video\s*converter", r"video\s*format",
        r"privacy\s*(display|guard|hide|screen)", r"\bhide\s*(screen|app)",
        r"home\s*(decor|design|magic)\s*ai", r"interior\s*design\s*ai",  # ai_utility moved later if needed
    ]),
    # SUBSCRIPTION_CONTENT extra (health, weather, news patterns moved here from below)
    ("subscription_content", [
        r"blood\s*pressure", r"\bBP\b\s*(monitor|log|checker)", r"heart\s*rate",
        r"glucose", r"diabetes", r"period\s*tracker", r"pregnancy", r"baby\s*tracker",
        r"calorie", r"step\s*counter", r"pedometer",
        r"weather\s*(radar|map|live|forecast)",
    ]),
    # SHOPPING_ECOM
    ("shopping_ecom", [
        r"shopping\s*(app|deals)", r"\bshop\s*online", r"deals\s*app", r"coupon",
        r"marketplace", r"price\s*(track|compare)",
    ]),
    # MUSIC / AUDIO
    ("music_audio", [
        r"music\s*(player|download|maker)", r"\bmp3\s*(player|cutter)",
        r"ringtone", r"audio\s*(player|edit|cut|book)", r"sound\s*(effect|board)",
        r"voice\s*(record|chang|effect)", r"karaoke", r"\bpiano\b", r"\bguitar\b",
        r"\bdj\s*(music|mixer|maker)", r"beat\s*(maker|pad)", r"drum\s*(pad|kit)",
    ]),
    # PERSONALIZATION — wallpaper, theme, charging anim, keyboard themes
    ("personalization", [
        r"\b(live\s*)?wallpaper\b", r"lock\s*screen", r"\btheme(s)?\b", r"icon\s*pack",
        r"battery\s*(charging|animation|wallpaper)", r"charging\s*(animation|effect|screen|wallpaper)",
        r"\bLED\b.*\b(border|edge|light|wallpaper)\b", r"phone\s*(decoration|cool|cute)",
        r"3d\s*battery", r"\bborder\s*light",
        r"keyboard\s*(theme|fancy|cool|emoji|pretty)", r"fancy\s*keyboard", r"cool\s*keyboard",
        r"font\s*(maker|pack|style)", r"sticker\s*maker",
    ]),
]

CATEGORIES = list(dict.fromkeys([r[0] for r in RULES])) + ["other"]


def classify(name, store_id=""):
    text = f"{name} {store_id}".lower()
    for category, patterns in RULES:
        for pat in patterns:
            if re.search(pat, text, re.IGNORECASE):
                return category
    return "other"


def main():
    with open(SRC, "r", encoding="utf-8") as f:
        data = json.load(f)
    apps = data["apps"]

    # Classify
    by_cat = defaultdict(list)
    for a in apps:
        cat = classify(a.get("displayName", ""), a.get("appStoreId", ""))
        a["_category"] = cat
        by_cat[cat].append(a)

    # Aggregate per category
    summary = []
    for cat in CATEGORIES:
        items = by_cat[cat]
        if not items:
            continue
        rev = sum(x.get("todayRevenue", 0) or 0 for x in items)
        imp = sum(x.get("todayImpressions", 0) or 0 for x in items)
        ecpms = [x.get("todayEcpm", 0) or 0 for x in items if x.get("todayImpressions", 0)]
        avg_ecpm = (sum(ecpms) / len(ecpms)) if ecpms else 0
        ios_n = len([x for x in items if x.get("platform") == "IOS"])
        android_n = len([x for x in items if x.get("platform") == "ANDROID"])
        summary.append({
            "category": cat,
            "apps": len(items),
            "ios": ios_n,
            "android": android_n,
            "revenue_today": round(rev, 2),
            "impressions_today": imp,
            "avg_ecpm": round(avg_ecpm, 3),
            "rev_share_pct": 0,  # filled below
        })

    total_rev = sum(s["revenue_today"] for s in summary)
    for s in summary:
        s["rev_share_pct"] = round(s["revenue_today"] / total_rev * 100, 2) if total_rev else 0
    summary.sort(key=lambda s: -s["revenue_today"])

    # Top 30 apps by revenue today
    top_apps = sorted(apps, key=lambda x: -(x.get("todayRevenue") or 0))[:30]

    # Distribution per category, top 5 apps each
    per_cat_top = {}
    for cat in CATEGORIES:
        items = sorted(by_cat[cat], key=lambda x: -(x.get("todayRevenue") or 0))[:5]
        if items:
            per_cat_top[cat] = [
                {
                    "name": x.get("displayName"),
                    "store_id": x.get("appStoreId"),
                    "platform": x.get("platform"),
                    "revenue": round(x.get("todayRevenue", 0) or 0, 2),
                    "impressions": x.get("todayImpressions", 0),
                    "ecpm": round(x.get("todayEcpm", 0) or 0, 2),
                    "fill_rate": round(x.get("todayFillRate", 0) or 0, 2),
                }
                for x in items
            ]

    # Long tail: apps with revenue < $1
    tail = [x for x in apps if (x.get("todayRevenue") or 0) < 1]
    head = [x for x in apps if (x.get("todayRevenue") or 0) >= 100]

    # Pareto
    sorted_apps = sorted(apps, key=lambda x: -(x.get("todayRevenue") or 0))
    cum = 0
    p80_n = 0
    for i, a in enumerate(sorted_apps):
        cum += a.get("todayRevenue", 0) or 0
        if cum >= total_rev * 0.8:
            p80_n = i + 1
            break

    # Output JSON for further use
    out_classified = OUT_DIR / "_data" / "amobear_apps_classified.json"
    out_classified.parent.mkdir(exist_ok=True)
    with open(out_classified, "w", encoding="utf-8") as f:
        json.dump({
            "summary": summary,
            "totals": {
                "apps": len(apps),
                "ios": len([a for a in apps if a.get("platform") == "IOS"]),
                "android": len([a for a in apps if a.get("platform") == "ANDROID"]),
                "revenue_today": round(total_rev, 2),
                "impressions_today": sum(a.get("todayImpressions", 0) or 0 for a in apps),
                "head_count_rev_ge_100": len(head),
                "tail_count_rev_lt_1": len(tail),
                "pareto_p80_n": p80_n,
            },
            "top_apps": [
                {
                    "name": x.get("displayName"),
                    "store_id": x.get("appStoreId"),
                    "platform": x.get("platform"),
                    "category": x.get("_category"),
                    "revenue": round(x.get("todayRevenue", 0) or 0, 2),
                    "impressions": x.get("todayImpressions", 0),
                    "ecpm": round(x.get("todayEcpm", 0) or 0, 2),
                    "fill_rate": round(x.get("todayFillRate", 0) or 0, 2),
                    "rev_change_pct": round(x.get("todayRevenueChangePct", 0) or 0, 2),
                }
                for x in top_apps
            ],
            "per_category_top5": per_cat_top,
        }, f, indent=2, ensure_ascii=False)

    # Print summary
    print("=== TOTALS ===")
    print(f"Apps: {len(apps)} (iOS: {len([a for a in apps if a.get('platform') == 'IOS'])}, Android: {len([a for a in apps if a.get('platform') == 'ANDROID'])})")
    print(f"Revenue today: ${total_rev:,.2f}")
    print(f"Impressions today: {sum(a.get('todayImpressions', 0) or 0 for a in apps):,}")
    print(f"Pareto P80: {p80_n} apps tạo 80% revenue")
    print(f"Head ($>=100/day): {len(head)} apps")
    print(f"Tail ($<1/day): {len(tail)} apps")
    print()
    print("=== BY CATEGORY ===")
    print(f"{'Category':<25} {'Apps':>5} {'iOS':>4} {'Android':>7} {'Revenue':>12} {'Share%':>7} {'Imps':>11} {'AvgeCPM':>9}")
    for s in summary:
        print(f"{s['category']:<25} {s['apps']:>5} {s['ios']:>4} {s['android']:>7} ${s['revenue_today']:>11,.2f} {s['rev_share_pct']:>6.2f}% {s['impressions_today']:>11,} ${s['avg_ecpm']:>8.2f}")
    print()
    print(f"Saved: {out_classified}")


if __name__ == "__main__":
    main()
