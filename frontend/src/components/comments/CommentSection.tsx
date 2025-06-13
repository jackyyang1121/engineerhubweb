import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { toast } from 'react-toastify';

import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import * as commentApi from '../../api/commentApi';
// 導入重構後的分頁Hook - 遵循高階工程師原則
import { useInfiniteScroll } from '../../hooks/usePagination';

interface CommentSectionProps {
  postId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();
  
  // 使用重構後的無限滾動分頁Hook - 遵循 Narrowly focused 原則
  // 這個Hook專門處理無限滾動邏輯，提供統一的分頁體驗
  const {
    data: comments,
    loading: isLoading,
    error,
    loadMore,
    hasNextPage,
    refresh: refetch
  } = useInfiniteScroll(
    // 分頁函數 - 遵循 Flexible 原則，支援不同的API格式
    (page, pageSize) => commentApi.getCommentsByPostId(postId, page, pageSize),
    10 // 每頁顯示數量
  );
  
  // 錯誤狀態處理 - 提供一致的錯誤體驗
  const isError = !!error;
  // 重命名以保持兼容性
  const fetchNextPage = loadMore;
  
  // 創建評論的mutation
  const createCommentMutation = useMutation({
    mutationFn: commentApi.createComment,
    onSuccess: () => {
      // 刷新評論列表
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('評論已發布');
    },
    onError: (error) => {
      toast.error('評論發布失敗，請重試');
      console.error('評論發布錯誤:', error);
    }
  });
  
  // 處理評論提交
    const handleCommentSubmit = (content: string) => {    createCommentMutation.mutate({      post: postId,      content    });  };
  
  // 滾動到底部加載更多評論 - 使用重構後的邏輯
  if (inView && hasNextPage && !isLoading) {
    fetchNextPage();
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">評論</h2>
      
      {/* 評論表單 */}
      <div className="mb-8">
        <CommentForm 
          onSubmit={handleCommentSubmit} 
          isLoading={createCommentMutation.isPending}
        />
      </div>
      
      {/* 評論列表 */}
      <div>
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-gray-500">加載評論中...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-4">
            <p className="text-red-500">無法加載評論</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-primary-600 hover:text-primary-700"
            >
              重試
            </button>
          </div>
        ) : (
          <>
            {/* 重構後的評論渲染 - 使用統一的數據結構 */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  postId={postId}
                />
              ))}
            </div>
            
            {/* 沒有評論 */}
            {comments.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <p className="text-gray-500">還沒有評論，成為第一個發表評論的人吧！</p>
              </div>
            )}
            
            {/* 無限滾動加載指示器 - 使用重構後的狀態 */}
            {hasNextPage && (
              <div ref={ref} className="py-4 text-center">
                {isLoading ? '加載更多評論...' : ''}
              </div>
            )}
            
            {/* 已載入所有評論的提示 */}
            {!hasNextPage && comments.length > 0 && (
              <div className="py-4 text-center text-gray-500">
                已顯示所有評論
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommentSection; 