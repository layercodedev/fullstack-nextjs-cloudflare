'use client';

import { useRef, useState } from 'react';
import { MicrophoneIcon } from './MicrophoneIcon';

type Props = {
  triggerUserTurnStarted: () => void;
  triggerUserTurnFinished: () => void;
};

export default function PushToTalkButton({ triggerUserTurnStarted, triggerUserTurnFinished }: Props) {
  const [isPressed, setIsPressed] = useState(false);
  const pressedRef = useRef(false);

  function beginPress() {
    if (!pressedRef.current) {
      pressedRef.current = true;
      setIsPressed(true);
      triggerUserTurnStarted();
    }
  }

  function endPress() {
    if (pressedRef.current) {
      pressedRef.current = false;
      setIsPressed(false);
      triggerUserTurnFinished();
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-pressed={isPressed}
        aria-label="Press and hold to talk"
        className={`relative w-25 h-25 rounded-full flex items-center justify-center border transition-all duration-150 transform select-none focus:outline-none ${
          isPressed
            ? 'bg-emerald-900/40 text-emerald-200 border-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)] scale-[0.95]'
            : 'bg-neutral-900 text-neutral-200 border-violet-900  hover:border-violet-600 shadow-[0px_0px_20px_rgba(147,_51,_234,_0.50)]'
        }`}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          beginPress();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          endPress();
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          endPress();
        }}
        onPointerLeave={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          endPress();
        }}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !isPressed) {
            event.preventDefault();
            beginPress();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            endPress();
          }
        }}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-full transition-all duration-200 pointer-events-none ${
            isPressed ? 'opacity-100 scale-110 bg-emerald-500/20 blur-md' : 'opacity-0 scale-95'
          }`}
        />
        <span className="relative flex flex-col items-center gap-2">
          <MicrophoneIcon />
          <span className="text-[10px] uppercase tracking-widest text-neutral-400">Hold</span>
        </span>
      </button>
      <span className="text-[11px] uppercase tracking-wider text-neutral-400">Press and hold to speak</span>
    </div>
  );
}
