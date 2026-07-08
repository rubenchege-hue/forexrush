#!/bin/bash
cd /home/z/my-project

# Kill any existing server
pkill -9 -f "next" 2>/dev/null || true
rm -f .next/dev/lock
sleep 1

# Start server
npx next dev -p 3000 > /tmp/next-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for ready
for i in $(seq 1 40); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
done

sleep 5

# Get active competition ID
COMP_ID=$(curl -s http://localhost:3000/api/competitions | python3 -c "
import sys,json
d=json.load(sys.stdin)
active = [c for c in d if c['status']=='active']
print(active[0]['id'] if active else (d[1]['id'] if len(d)>1 else d[0]['id']))
")
echo "Active Competition: $COMP_ID"

echo ""
echo "========================================="
echo "  TEST 1: License Verify (valid code)"
echo "========================================="
curl -s "http://localhost:3000/api/license?code=COMP-XAJI-0Y6D"
echo ""

echo ""
echo "========================================="
echo "  TEST 2: License Verify (invalid code)"
echo "========================================="
curl -s "http://localhost:3000/api/license?code=INVALID-CODE"
echo ""

echo ""
echo "========================================="
echo "  TEST 3: Leaderboard (before enroll)"
echo "========================================="
curl -s "http://localhost:3000/api/leaderboard?competitionId=$COMP_ID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Total competitors: {len(d)}')
for e in d[:3]:
    name = e.get('displayName', e['username'])
    print(f'  #{e[\"rank\"]} {name} | PnL: \${e[\"totalPnl\"]:.2f} | ROI: {e[\"roi\"]}%')
"

echo ""
echo "========================================="
echo "  TEST 4: License Redeem (enroll)"
echo "========================================="
REDEEM=$(curl -s -X POST http://localhost:3000/api/license \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"COMP-PBHS-AHXT\",\"competitionId\":\"$COMP_ID\",\"username\":\"TestTrader\"}")
echo "Result: $REDEEM"

echo ""
echo "========================================="
echo "  TEST 5: Updated Leaderboard (after enroll)"
echo "========================================="
curl -s "http://localhost:3000/api/leaderboard?competitionId=$COMP_ID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
me = [e for e in d if e.get('username')=='TestTrader']
if me:
    e = me[0]
    print(f'TestTrader: #{e[\"rank\"]} | {e.get(\"displayName\",\"\")} | Balance: \${e[\"currentBalance\"]:.2f}')
else:
    print('TestTrader not found')
print(f'Total competitors: {len(d)}')
"

echo ""
echo "========================================="
echo "  TEST 6: Double Redeem (should fail)"
echo "========================================="
curl -s -X POST http://localhost:3000/api/license \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"COMP-PBHS-AHXT\",\"competitionId\":\"$COMP_ID\",\"username\":\"AnotherTrader\"}"
echo ""

echo ""
echo "========================================="
echo "  TEST 7: Recent Trades"
echo "========================================="
curl -s "http://localhost:3000/api/trades?competitionId=$COMP_ID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Recent trades: {len(d)}')
for t in d[:3]:
    pnl = f'+{t[\"pnl\"]:.2f}' if t['pnl']>=0 else f'-{abs(t[\"pnl\"]):.2f}'
    print(f'  {t[\"pair\"]} {t[\"direction\"]} | {pnl} | {t[\"status\"]}')
"

echo ""
echo "========================================="
echo "  ALL TESTS COMPLETE"
echo "========================================="