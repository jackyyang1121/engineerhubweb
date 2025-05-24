import React from 'react';
import { CheckIcon } from '@heroicons/react/20/solid';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  className = ''
}) => {
  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-xs font-medium text-green-500">
          任何密碼都可以使用
        </span>
        <div className="flex space-x-0.5">
          <div className="h-1 w-3 rounded-full bg-green-500" />
          <div className="h-1 w-3 rounded-full bg-green-500" />
          <div className="h-1 w-3 rounded-full bg-green-500" />
          <div className="h-1 w-3 rounded-full bg-green-500" />
          <div className="h-1 w-3 rounded-full bg-green-500" />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center space-x-1.5 text-xs">
          <CheckIcon className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
          <span className="text-green-600">無任何密碼限制</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs">
          <CheckIcon className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
          <span className="text-green-600">可使用任意長度和字符</span>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator; 