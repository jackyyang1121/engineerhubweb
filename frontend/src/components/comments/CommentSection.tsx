import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { toast } from 'react-toastify';

import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import * as commentApi from '../../api/commentApi';

interface CommentSectionProps {
  postId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();
  
  // 獲取評論列表
  const { 
    data, 
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: ({ pageParam = 1 }) => commentApi.getCommentsByPostId(postId, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        // 從URL中提取頁碼
        const nextUrl = new URL(lastPage.next);
        return parseInt(nextUrl.searchParams.get('page') || '1');
      }
      return undefined;
    },
    initialPageParam: 1,
  });
  
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
  const handleCommentSubmit = (content: string) => {
    createCommentMutation.mutate({
      post_id: postId,
      content
    });
  };
  
  // 滾動到底部加載更多評論
  if (inView && hasNextPage && !isFetchingNextPage) {
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
            {data?.pages.map((page, i) => (
              <div key={i} className="space-y-4">
                {page.results.map(comment => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    postId={postId}
                  />
                ))}
              </div>
            ))}
            
            {/* 沒有評論 */}
            {data?.pages[0].results.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">還沒有評論，成為第一個發表評論的人吧！</p>
              </div>
            )}
            
            {/* 無限滾動加載指示器 */}
            {hasNextPage && (
              <div ref={ref} className="py-4 text-center">
                {isFetchingNextPage ? '加載更多評論...' : ''}
              </div>
            )}
            
            {!hasNextPage && data?.pages[0].results.length > 0 && (
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