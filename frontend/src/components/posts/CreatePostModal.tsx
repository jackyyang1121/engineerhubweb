import { useRef, useEffect } from 'react';
import PostEditor from './PostEditor';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // 處理點擊模態框以外的區域關閉模態框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // 當模態框打開時添加點擊事件監聽器
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // 禁用背景滾動
      document.body.style.overflow = 'hidden';
    }
    
    // 清理函數
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // 恢復背景滾動
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  // 處理ESC按鍵關閉模態框
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* 模態框內容 */}
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 z-10"
      >
        <PostEditor onClose={onClose} onPostCreated={onPostCreated} />
      </div>
    </div>
  );
};

export default CreatePostModal; 