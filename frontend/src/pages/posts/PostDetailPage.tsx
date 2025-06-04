import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import PostCard from '../../components/posts/PostCard';
import CommentSection from '../../components/comments/CommentSection';
import * as postApi from '../../api/postApi';


const PostDetailPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // 獲取貼文詳情
  const { 
    data: post, 
    isLoading, 
    isError,
    error 
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postId ? postApi.getPostById(postId) : Promise.reject('缺少貼文 ID'),
    retry: false,
  });
  
  // 處理貼文更新
  const handlePostUpdated = () => {
    if (postId) {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    }
  };
  
  // 處理貼文刪除
  const handlePostDeleted = () => {
    navigate('/');
    toast.success('貼文已刪除');
  };

  // 加載中狀態
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-10">
        <p className="text-gray-500">正在加載貼文...</p>
      </div>
    );
  }
  
  // 錯誤狀態
  if (isError) {
    return (
      <div className="max-w-3xl mx-auto text-center py-10">
        <p className="text-red-500">無法加載貼文</p>
        <p className="text-sm text-gray-500 mt-2">
          {error instanceof Error ? error.message : '請檢查網絡連接或貼文是否存在'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 btn-primary py-2 px-4"
        >
          返回首頁
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 返回按鈕 */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </button>
      </div>
      
      {/* 貼文詳情 */}
      <div className="mb-8">
        {post && (
          <PostCard 
            post={post} 
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
          />
        )}
      </div>
      
      {/* 評論區 */}
      {post && (
        <CommentSection postId={post.id} />
      )}
    </div>
  );
};

export default PostDetailPage; 