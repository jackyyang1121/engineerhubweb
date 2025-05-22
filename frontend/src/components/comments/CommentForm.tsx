import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
  initialValue?: string;
  placeholder?: string;
  buttonText?: string;
  autoFocus?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  isLoading = false,
  initialValue = '',
  placeholder = '發表你的評論...',
  buttonText = '發布',
  autoFocus = false
}) => {
  const [content, setContent] = useState(initialValue);
  const user = useAuthStore(state => state.user);
  
  // 處理表單提交
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!content.trim()) {
      return;
    }
    
    onSubmit(content);
    setContent('');
  };
  
  return (
    <div className="flex items-start space-x-3">
      {/* 用戶頭像 */}
      <img
        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=random`}
        alt={user?.username || '使用者'}
        className="w-10 h-10 rounded-full mt-1"
      />
      
      {/* 評論表單 */}
      <form onSubmit={handleSubmit} className="flex-grow">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
          rows={2}
          disabled={isLoading}
          autoFocus={autoFocus}
        />
        
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!content.trim() || isLoading}
            className={`px-4 py-2 rounded-md ${
              !content.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isLoading ? '發布中...' : buttonText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentForm; 