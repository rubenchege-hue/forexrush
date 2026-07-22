'use client';

import { useState, useEffect, useRef } from 'react';
import { PAIRS } from '@/lib/constants';
import { Candle, PairData, genCandles, generateTick } from '@/lib/prices';

interface UsePricesReturn {
  candles: Record<string, Candle[]>;
  currentPrices: Record<string, number>;
  currentChanges: Record<string, number>;
  isLive: boolean;
  pairData: Record<string, PairData>;
  connectionStatus: 'connected' | 'connecting' | 'error';
}

export function usePrices(): UsePricesReturn {
  const [pairData, setPairData] = useState<Record<string, PairData>>({});
  const [marketLive, setMarketLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const isFirstFetch = useRef(true);
  const lastWsUpdate = useRef<Record<string, number>>({});

  useEffect(() => {
    const pd: Record<string, PairData> = {};
    for (const [s, c] of Object.entries(PAIRS)) {
      const cn = genCandles(300, c.p, c.vol);
      const cp = cn[cn.length - 1].c;
      pd[s] = { cn, cp, ch: ((cp - cn[0].o) / cn[0].o) * 100 };
    }
    setPairData(pd);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setPairData(prev => generateTick(prev));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        if (data && !data.error && typeof data === 'object' && !Array.isArray(data)) {
          setMarketLive(true);
          setConnectionStatus('connected');
          setPairData(prev => {
            const next = { ...prev };
            for (const [pair, price] of Object.entries(data)) {
              if (!next[pair]) continue;
              if (!isFirstFetch.current && PAIRS[pair]?.g === 'Crypto') continue;
              const cn = [...next[pair].cn];
              const last = cn[cn.length - 1];
              const cfg = PAIRS[pair];
              if (!cfg) continue;
              const o = last.c;
              const h = Math.max(o, price as number) + Math.random() * cfg.vol * 0.2;
              const l = Math.min(o, price as number) - Math.random() * cfg.vol * 0.2;
              cn.push({ o, h, l, c: price as number, v: 100 + Math.random() * 200, t: Date.now() });
              if (cn.length > 500) cn.shift();
              next[pair] = { ...next[pair], cn, cp: price as number, ch: ((price as number - cn[0].o) / cn[0].o) * 100 };
            }
            return next;
          });
          isFirstFetch.current = false;
        }
      } catch {
        setConnectionStatus('error');
      }
    };
    fetchPrices();
    const iv = setInterval(fetchPrices, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const streams = ['btcusdt@ticker', 'ethusdt@ticker', 'solusdt@ticker', 'xrpusdt@ticker', 'dogeusdt@ticker'];
    const pairMap: Record<string, string> = {
      BTCUSDT: 'BTC/USD', ETHUSDT: 'ETH/USD', SOLUSDT: 'SOL/USD',
      XRPUSDT: 'XRP/USD', DOGEUSDT: 'DOGE/USD',
    };
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`);
      } catch { return; }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const symbol = msg.data?.s;
          const price = parseFloat(msg.data?.c);
          if (!symbol || !price) return;
          const mapped = pairMap[symbol];
          if (!mapped) return;

          const now = Date.now();
          if (now - (lastWsUpdate.current[mapped] || 0) < 500) return;
          lastWsUpdate.current[mapped] = now;

          setPairData(prev => {
            if (!prev[mapped]) return prev;
            const cn = [...prev[mapped].cn];
            const last = cn[cn.length - 1];
            cn[cn.length - 1] = {
              ...last,
              c: price,
              h: Math.max(last.h, price),
              l: Math.min(last.l, price),
              v: (last.v || 0) + 10,
            };
            return {
              ...prev,
              [mapped]: { ...prev[mapped], cn, cp: price, ch: ((price - cn[0].o) / cn[0].o) * 100 },
            };
          });
        } catch { /* parse error */ }
      };

      ws.onclose = () => {
        setConnectionStatus('error');
        reconnectTimer = setTimeout(connect, 5000);
      };
      ws.onerror = () => {
        setConnectionStatus('error');
        ws?.close();
      };
      ws.onopen = () => {
        setConnectionStatus('connected');
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      try { ws?.close(); } catch {}
    };
  }, []);

  const candles = Object.fromEntries(
    Object.entries(pairData).map(([k, v]) => [k, v.cn])
  );

  const currentPrices = Object.fromEntries(
    Object.entries(pairData).map(([k, v]) => [k, v.cp])
  );

  const currentChanges = Object.fromEntries(
    Object.entries(pairData).map(([k, v]) => [k, v.ch])
  );

  return { candles, currentPrices, currentChanges, isLive: marketLive, pairData, connectionStatus };
}
