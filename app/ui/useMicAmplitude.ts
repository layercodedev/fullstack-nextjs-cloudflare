'use client';

import { useEffect, useRef, useState } from 'react';

// Returns a smoothed mic amplitude in the range 0..1
export default function useMicAmplitude(paused: boolean = false) {
  const [amplitude, setAmplitude] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const smoothRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        source.connect(analyser);

        dataRef.current = new Uint8Array(analyser.fftSize);

        if (paused) {
          try { await ctx.suspend(); } catch {}
        } else {
          try { await ctx.resume(); } catch {}
        }

        draw();
      } catch {
        // ignore; leave amplitude at 0
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { analyserRef.current?.disconnect(); } catch {}
      try { sourceRef.current?.disconnect(); } catch {}
      try { audioCtxRef.current?.close(); } catch {}
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      analyserRef.current = null;
      sourceRef.current = null;
      audioCtxRef.current = null;
      dataRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const toggle = async () => {
      try {
        if (paused) await ctx.suspend();
        else await ctx.resume();
      } catch {}
    };
    toggle();
  }, [paused]);

  const draw = () => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return;

    const render = () => {
      const now = performance.now();
      if (now - lastTimeRef.current < 33) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      lastTimeRef.current = now;

      analyser.getByteTimeDomainData(data);
      // Convert to -1..1 and compute RMS
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128; // -1..1
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length); // 0..~1

      // Light envelope smoothing
      const prev = smoothRef.current;
      const smoothed = prev + (rms - prev) * 0.2;
      smoothRef.current = smoothed;

      // Normalize a bit so regular speech makes good range
      const normalized = Math.min(1, smoothed * 2.5);
      setAmplitude(normalized);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
  };

  return amplitude;
}


