import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { 
  HeartIcon as HeartOutlineIcon, 
  TrashIcon, 
  PencilIcon,
  ArrowUturnLeftIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import { useAuthStore } from '../../store/authStore';
import CommentForm from './CommentForm';
import * as commentApi from '../../api/commentApi';

// 評論類型
export interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  likes_count: number;
  is_liked: boolean;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  parent_id?: string;
  replies_count?: number;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  isReply?: boolean;
  onReplySubmitted?: () => void;
}

// 回覆結果類型
interface RepliesResult {
  results: Comment[];
  count: number;
  next: string | null;
  previous: string | null;
}

// 分頁評論數據類型
interface CommentPageData {
  results: Comment[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface InfiniteCommentData {
  pages: CommentPageData[];
  pageParams: unknown[];
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  postId, 
  isReply = false,
  onReplySubmitted
}) => {
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(comment.is_liked);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const currentUser = useAuthStore(state => state.user);
  const isCommentOwner = currentUser?.id === comment.user.id;
  
  // 格式化日期
  const formattedDate = format(new Date(comment.created_at), 'PPp', { locale: zhTW });
  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;
  
  // 點讚評論的mutation
  const likeMutation = useMutation({
    mutationFn: () => commentApi.likeComment(comment.id),
    onSuccess: () => {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    },
    onError: () => {
      toast.error('點讚失敗，請重試');
    }
  });
  
  // 取消點讚評論的mutation
  const unlikeMutation = useMutation({
    mutationFn: () => commentApi.unlikeComment(comment.id),
    onSuccess: () => {
      setIsLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    },
    onError: () => {
      toast.error('取消點讚失敗，請重試');
    }
  });
  
  // 刪除評論的mutation
  const deleteMutation = useMutation({
    mutationFn: () => commentApi.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('評論已刪除');
    },
    onError: () => {
      toast.error('刪除評論失敗，請重試');
    }
  });
  
  // 更新評論的mutation
  const updateMutation = useMutation({
    mutationFn: (content: string) => commentApi.updateComment(comment.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setIsEditing(false);
      toast.success('評論已更新');
    },
    onError: () => {
      toast.error('更新評論失敗，請重試');
    }
  });
  
  // 回覆評論的mutation
  const replyMutation = useMutation({
        mutationFn: (content: string) => commentApi.createComment({      post: postId,      content,      parent: comment.id    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setIsReplying(false);
      // 顯示回覆列表
      setShowReplies(true);
      if (onReplySubmitted) {
        onReplySubmitted();
      }
      toast.success('回覆已發布');
    },
    onError: () => {
      toast.error('回覆發布失敗，請重試');
    }
  });
  
  // 獲取評論的回覆
  const fetchRepliesMutation = useMutation({
    mutationFn: () => commentApi.getCommentReplies(comment.id),
    onSuccess: (data: RepliesResult) => {
      // 將回覆數據添加到評論中
      queryClient.setQueryData(['comments', postId], (oldData: InfiniteCommentData | undefined) => {
        if (!oldData?.pages) return oldData;
        
        const updatedPages = oldData.pages.map((page: CommentPageData) => {
          if (!page?.results) return page;
          
          const updatedResults = page.results.map((c: Comment) => {
            if (c.id === comment.id) {
              return { ...c, replies: data.results };
            }
            return c;
          });
          return { ...page, results: updatedResults };
        });
        return { ...oldData, pages: updatedPages };
      });
    },
    onError: () => {
      toast.error('加載回覆失敗，請重試');
    }
  });
  
  // 處理點讚/取消點讚
  const handleLikeToggle = () => {
    if (isLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };
  
  // 處理刪除評論
  const handleDelete = () => {
    if (window.confirm('確定要刪除這條評論嗎？')) {
      deleteMutation.mutate();
    }
    setShowActions(false);
  };
  
  // 處理回覆提交
  const handleReplySubmit = (content: string) => {
    replyMutation.mutate(content);
  };
  
  // 處理編輯提交
  const handleEditSubmit = (content: string) => {
    updateMutation.mutate(content);
  };
  
  // 切換顯示回覆
  const handleToggleReplies = () => {
    if (!showReplies && (!comment.replies || comment.replies.length === 0)) {
      fetchRepliesMutation.mutate();
    }
    setShowReplies(!showReplies);
  };

  return (
    <div className={`${isReply ? 'ml-12' : ''}`}>
      <div className="flex items-start space-x-3">
        {/* 用戶頭像 */}
        <Link to={`/profile/${comment.user.username}`} className="shrink-0">
          <img
            src={comment.user.avatar || `https://ui-avatars.com/api/?name=${comment.user.username}&background=random`}
            alt={comment.user.username}
            className="w-8 h-8 rounded-full"
          />
        </Link>
        
        {/* 評論內容 */}
        <div className="flex-grow bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between items-start">
            <div>
              <Link 
                to={`/profile/${comment.user.username}`}
                className="font-medium text-gray-900 hover:text-primary-600"
              >
                {comment.user.username}
              </Link>
              <span className="text-xs text-gray-500 ml-2">{formattedDate}</span>
              {isEdited && <span className="text-xs text-gray-500 ml-1">(已編輯)</span>}
            </div>
            
            {/* 更多操作按鈕 */}
            {isCommentOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
                
                {/* 操作下拉菜單 */}
                {showActions && (
                  <div className="absolute right-0 mt-1 w-32 bg-white shadow-lg rounded-md overflow-hidden z-10">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      編輯
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      刪除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 評論編輯表單 */}
          {isEditing ? (
            <div className="mt-2">
              <CommentForm
                initialValue={comment.content}
                onSubmit={handleEditSubmit}
                isLoading={updateMutation.isPending}
                buttonText="更新"
                autoFocus
              />
              <button
                onClick={() => setIsEditing(false)}
                className="mt-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                取消
              </button>
            </div>
          ) : (
            <>
              <p className="mt-1 text-gray-800 whitespace-pre-line">{comment.content}</p>
              
              {/* 評論操作 */}
              <div className="mt-2 flex items-center space-x-4 text-sm">
                {/* 點讚按鈕 */}
                <button
                  onClick={handleLikeToggle}
                  className={`flex items-center ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
                  aria-label={isLiked ? '取消點讚' : '點讚'}
                >
                  {isLiked ? (
                    <HeartSolidIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <HeartOutlineIcon className="h-4 w-4 mr-1" />
                  )}
                  {likesCount > 0 && <span>{likesCount}</span>}
                </button>
                
                {/* 回覆按鈕 */}
                {!isReply && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="flex items-center text-gray-500 hover:text-gray-700"
                  >
                    <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
                    回覆
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* 回覆表單 */}
      {isReplying && (
        <div className="mt-3 ml-12">
          <CommentForm
            onSubmit={handleReplySubmit}
            isLoading={replyMutation.isPending}
            placeholder={`回覆 @${comment.user.username}...`}
            buttonText="回覆"
            autoFocus
          />
          <button
            onClick={() => setIsReplying(false)}
            className="mt-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            取消
          </button>
        </div>
      )}
      
      {/* 查看/隱藏回覆按鈕 */}
      {!isReply && comment.replies_count && comment.replies_count > 0 && (
        <button
          onClick={handleToggleReplies}
          className="mt-2 ml-12 text-primary-600 hover:text-primary-700 text-sm flex items-center"
        >
          {showReplies ? '隱藏' : '查看'} {comment.replies_count} 條回覆
          {fetchRepliesMutation.isPending && <span className="ml-2">加載中...</span>}
        </button>
      )}
      
      {/* 回覆列表 */}
      {!isReply && showReplies && comment.replies && (
        <div className="mt-3 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem; 