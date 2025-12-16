import { useEffect, useState } from "react";

interface AudioWaveAnimationProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
}

const AudioWaveAnimation = ({ isActive, barCount = 5, className = "" }: AudioWaveAnimationProps) => {
  const [heights, setHeights] = useState<number[]>(Array(barCount).fill(20));

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(barCount).fill(20));
      return;
    }

    const interval = setInterval(() => {
      setHeights(prev => 
        prev.map(() => Math.random() * 80 + 20) // Random height between 20% and 100%
      );
    }, 150);

    return () => clearInterval(interval);
  }, [isActive, barCount]);

  return (
    <div className={`flex items-end justify-center gap-1 h-12 ${className}`}>
      {heights.map((height, index) => (
        <div
          key={index}
          className="w-1.5 bg-primary rounded-full transition-all duration-150 ease-out"
          style={{ 
            height: `${isActive ? height : 20}%`,
            opacity: isActive ? 1 : 0.3
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaveAnimation;
