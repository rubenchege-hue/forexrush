#!/bin/bash
cd /home/z/my-project
pkill -9 -f "next" 2>/dev/null; pkill -9 -f "keep-alive" 2>/dev/null
rm -f db/custom.db .next/dev/lock
sleep 1
bunx prisma db push --force-reset 2>&1 | tail -1
npx next dev -p 3000 > /tmp/next-server.log 2>&1 &

# Wait for server
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "Server ready after ${i}s"; break; fi; sleep 1; done

# Trigger seed directly (client-side JS won't run via curl)
echo "Seeding database..."
curl -s -X POST http://localhost:3000/api/seed -o /dev/null
sleep 2

COMP_ID=$(curl -s http://localhost:3000/api/competitions | python3 -c "
import sys,json
d=json.load(sys.stdin)
active = [c for c in d if c['status']=='active']
print(active[0]['id'] if active else d[0]['id'] if d else '')
")
echo "Comp: $COMP_ID"

# Redeem license
RESULT=$(curl -s -X POST http://localhost:3000/api/license \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"COMP-8MDD-4V30\",\"competitionId\":\"$COMP_ID\",\"username\":\"TradeTest\"}")
echo "Enroll: $RESULT"

MY_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('competitor',{}).get('id',''))")
echo "My ID: $MY_ID"

# Place a trade
echo ""
echo "=== PLACE TRADE ==="
TRADE=$(curl -s -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d "{\"competitorId\":\"$MY_ID\",\"competitionId\":\"$COMP_ID\",\"pair\":\"EUR/USD\",\"direction\":\"long\",\"lotSize\":0.1}")
echo "Trade: $TRADE"
TRADE_ID=$(echo "$TRADE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
echo "Trade ID: $TRADE_ID"

# Close the trade
echo ""
echo "=== CLOSE TRADE ==="
CLOSE=$(curl -s -X PATCH http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d "{\"tradeId\":\"$TRADE_ID\",\"competitorId\":\"$MY_ID\"}")
echo "Close result: $(echo "$CLOSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'PnL: \${d.get(\"pnl\",0):.2f}, New Balance: \${d.get(\"currentBalance\",0):.2f}')")"

# Check leaderboard
echo ""
echo "=== LEADERBOARD ==="
curl -s "http://localhost:3000/api/leaderboard?competitionId=$COMP_ID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
me = [e for e in d if e.get('username')=='TradeTest']
if me:
    e = me[0]
    print(f'TradeTest: #{e[\"rank\"]} | Balance: \${e[\"currentBalance\"]:.2f} | PnL: \${e[\"totalPnl\"]:.2f} | Trades: {e[\"totalTrades\"]} | WR: {e[\"winRate\"]}%')
else:
    print('TradeTest not found')
"

echo ""
echo "=== ALL TRADE TESTS DONE ==="