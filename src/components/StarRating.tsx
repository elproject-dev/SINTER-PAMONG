import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  score?: number | null;
  size?: number;
  className?: string;
  starClassName?: string;
  strokeWidth?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  score = 0, 
  size = 16, 
  className = "flex items-center justify-center gap-0.5 text-slate-300",
  starClassName = "",
  strokeWidth
}) => {
  const currentScore = score || 0;
  return (
    <div className={className}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(0, Math.min(100, (currentScore - (star - 1)) * 100));

        if (fillPercentage === 100) {
          return <Star key={star} size={size} strokeWidth={strokeWidth ?? 2} className={`fill-amber-400 text-amber-500 ${starClassName}`} />;
        } else if (fillPercentage > 0) {
          return (
            <div key={star} className="relative inline-flex" style={{ width: size, height: size }}>
              <Star size={size} strokeWidth={strokeWidth ?? 1} className={`absolute inset-0 stroke-current text-slate-300 ${starClassName}`} />
              <div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: `${fillPercentage}%` }}>
                <Star size={size} strokeWidth={strokeWidth ?? 2} className={`fill-amber-400 text-amber-500 ${starClassName}`} />
              </div>
            </div>
          );
        } else {
          return <Star key={star} size={size} strokeWidth={strokeWidth ?? 1} className={`stroke-current text-slate-300 ${starClassName}`} />;
        }
      })}
    </div>
  );
};
















