import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function Spinner({ label = 'Loading', full }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${
        full ? 'min-h-[60vh]' : 'py-12'
      }`}
    >
      <DotLottieReact
        src="/animation/detective_search.lottie"
        loop
        autoplay
        style={{ width: 130, height: 130 }}
      />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );
}