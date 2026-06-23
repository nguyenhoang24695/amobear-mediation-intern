import json, sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\GoogleDrive\nquang85\My Drive\AndroidVN\Amobear\apps.json', 'r', encoding='utf-8') as f:
    apps = json.load(f)['apps']
sys.path.insert(0, r'D:\Git\Amobear\Amobear.Mediation.Tools\docs\plans\_scripts')
from classify_apps import classify

# Top 50 "other" by revenue
others = [(a, classify(a.get('displayName',''), a.get('appStoreId',''))) for a in apps]
others = [a for a, c in others if c == 'other']
others.sort(key=lambda x: -(x.get('todayRevenue') or 0))
print('=== Top 50 OTHER apps ===')
for a in others[:50]:
    name = a.get('displayName','')[:55]
    sid = a.get('appStoreId','')[:55]
    rev = a.get('todayRevenue', 0) or 0
    print(f"${rev:>8,.2f} | {name:<55} | {sid}")
