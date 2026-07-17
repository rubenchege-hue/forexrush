'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PAIRS } from '@/lib/constants';
import { PairData } from '@/lib/prices';

interface Position {
  id: string;
  pair: string;
  side: string;
  size: number;
  entry: number;
  mark: number;
  pnl: number;
  leverage: number;
  time: string;
}

interface HistoryEntry {
  id: string;
  pair: string;
  side: string;
  size: number;
  entry: number;
  exit: number;
  pnl: number;
  leverage: number;
  time: string;
}

interface UseTradingReturn {
  positions: Position[];
  balance: number;
  totalPnl: number;
  history: HistoryEntry[];
  openTrade: (pair: string, direction: 'buy' | 'sell', lotSize: number) => Promise<void>;
  closeTrade: (tradeId: string) => Promise<void>;
}

export function useTrading(
  pairData: Record<string, PairData>,
  myId: string,
  compId: string
): UseTradingReturn {
  const [balance, setBalance] = useState(10000);
  const balanceRef = useRef(10000);
  const [positions, setPositions] = useState<Position[]>([]);
  const positionsRef = useRef<Position[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [totalPnl, setTotalPnl] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      positionsRef.current = positionsRef.current.map(p => {
        const d = pairData[p.pair];
        if (!d) return p;
        const cfg = PAIRS[p.pair];
        if (!cfg) return p;
        const dir = p.side === 'Long' ? 1 : -1;
        let pnl = (d.cp - p.entry) * p.size * cfg.ls * dir;
        if (p.pair.includes('JPY') && !p.pair.startsWith('XRP') && !p.pair.startsWith('DOGE')) pnl /= d.cp;
        return { ...p, mark: d.cp, pnl };
      });
      const tp = positionsRef.current.reduce((s: number, p: Position) => s + p.pnl, 0);
      setTotalPnl(tp);
      setBalance(balanceRef.current + tp);
      setPositions([...positionsRef.current]);
    }, 500);
    return () => clearInterval(iv);
  }, [pairData]);

  const openTrade = useCallback(async (pair: string, direction: 'buy' | 'sell', lotSize: number) => {
    if (!compId) return;
    const d = pairData[pair];
    if (!d) return;
    const cfg = PAIRS[pair];
    const leverage = 10;
    const margin = (lotSize * cfg.ls * d.cp) / leverage;
    if (margin > balanceRef.current) return;

    const pos: Position = {
      id: Date.now().toString(),
      pair,
      side: direction === 'buy' ? 'Long' : 'Short',
      size: lotSize,
      entry: d.cp,
      mark: d.cp,
      pnl: 0,
      leverage,
      time: new Date().toISOString(),
    };
    positionsRef.current = [...positionsRef.current, pos];
    setPositions([...positionsRef.current]);

    try {
      const tr = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId: myId, competitionId: compId,
          pair, direction, lotSize,
        }),
      });
      const trData = await tr.json();
      if (trData.id) pos.id = trData.id;
    } catch { /* silent */ }
  }, [pairData, myId, compId]);

  const closeTrade = useCallback(async (tradeId: string) => {
    const idx = positionsRef.current.findIndex(p => p.id === tradeId);
    if (idx === -1) return;
    const p = positionsRef.current[idx];
    balanceRef.current += p.pnl;
    setBalance(balanceRef.current);
    setHistory(prev => [{ ...p, exit: p.mark, time: new Date().toISOString() }, ...prev]);
    positionsRef.current.splice(idx, 1);
    setPositions([...positionsRef.current]);

    try {
      await fetch('/api/trades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: p.id, competitorId: myId }),
      });
    } catch { /* silent */ }
  }, [myId]);

  return { positions, balance, totalPnl, history, openTrade, closeTrade };
}
