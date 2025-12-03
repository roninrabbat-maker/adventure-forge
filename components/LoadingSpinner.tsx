
import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-16 h-16 border-4 border-t-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
      <p className="text-cyan-300 font-semibold">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
