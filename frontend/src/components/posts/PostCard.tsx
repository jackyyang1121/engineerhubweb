import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import {
  ChatBubbleLeftEllipsisIcon,
  HeartIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  CodeBracketIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';

import type { Post } from '../../api/postApi';
import * as postApi from '../../api/postApi';
import { useAuthStore } from '../../store/authStore';

interface PostCardProps {
  post: Post;
  onPostDeleted?: () => void;
  onPostUpdated?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostDeleted,
  onPostUpdated
}) => {
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [isSaved, setIsSaved] = useState(post.is_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [expandCode, setExpandCode] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const currentUser = useAuthStore(state => state.user);
  
  // 检查当前用户是否是贴文作者
  const isAuthor = currentUser && String(currentUser.id) === String(post.author);
  
  // 处理点赞
  const handleLike = async () => {
    try {
      if (isLiked) {
        await postApi.unlikePost(post.id);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await postApi.likePost(post.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
      if (onPostUpdated) {
        onPostUpdated();
      }
    } catch (error) {
      toast.error('操作失败，请重试');
      console.error('点赞/取消点赞失败:', error);
    }
  };
  
  // 处理收藏
  const handleSave = async () => {
    try {
      if (isSaved) {
        await postApi.unsavePost(post.id);
        setIsSaved(false);
      } else {
        await postApi.savePost(post.id);
        setIsSaved(true);
      }
      if (onPostUpdated) {
        onPostUpdated();
      }
    } catch (error) {
      toast.error('操作失败，请重试');
      console.error('收藏/取消收藏失败:', error);
    }
  };
  
  // 处理分享
  const handleShare = () => {
    try {
      const url = `${window.location.origin}/post/${post.id}`;
      navigator.clipboard.writeText(url);
      toast.success('链接已复制到剪贴板');
    } catch (error) {
      toast.error('复制链接失败，请手动复制');
      console.error('复制链接失败:', error);
    }
  };
  
  // 复制代码
  const copyCode = () => {
    try {
      navigator.clipboard.writeText(post.code_snippet || '');
      toast.success('代码已复制到剪贴板');
    } catch (error) {
      toast.error('复制代码失败，请手动复制');
      console.error('复制代码失败:', error);
    }
  };
  
  // 处理删除贴文
  const handleDelete = async () => {
    if (!isAuthor) {
      toast.error('您没有权限删除此贴文');
      return;
    }
    
    // 确认删除
    if (!window.confirm('确定要删除这条贴文吗？删除后无法恢复。')) {
      return;
    }
    
    setIsDeleting(true);
    setShowOptions(false);
    
    try {
      await postApi.deletePost(post.id);
      toast.success('贴文删除成功');
      
      // 调用回调函数通知父组件贴文已删除
      if (onPostDeleted) {
        onPostDeleted();
      }
    } catch (error: unknown) {
      console.error('删除贴文失败:', error);
      
      // 显示详细错误信息 - 处理后端自定义异常格式
      let errorMessage = '删除贴文失败，请重试';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Record<string, unknown> } };
        if (axiosError.response?.data) {
          const responseData = axiosError.response.data;
          
          // 处理后端自定义异常处理器的格式
          if (responseData.success === false && responseData.error) {
            const errorObj = responseData.error as Record<string, unknown>;
            errorMessage = (errorObj.message as string) || (errorObj.detail as string) || errorMessage;
          } 
          // 处理普通的DRF错误格式
          else if (responseData.detail) {
            errorMessage = responseData.detail as string;
          } else if (responseData.message) {
            errorMessage = responseData.message as string;
          } else if (typeof responseData === 'string') {
            errorMessage = responseData;
          }
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 举报贴文
  const handleReport = () => {
    setShowOptions(false);
    // 实际应用中这里应该弹出一个举报模态框
    toast.info('举报功能即将推出');
  };
  
  // 切换到下一个媒体
  const nextMedia = () => {
    if (currentMediaIndex < post.media.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    }
  };
  
  // 切换到上一个媒体
  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    }
  };
  
  // 格式化时间
  const formattedDate = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: zhCN
  });
  
  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-300 overflow-hidden group ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* 贴文头部信息 */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100/50">
        <div className="flex items-center space-x-4">
          <Link to={`/profile/${post.author_details.username}`} className="relative group">
            <img
              src={post.author_details.avatar || `https://ui-avatars.com/api/?name=${post.author_details.username}&background=gradient`}
              alt={post.author_details.username}
              className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-lg group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
          </Link>
          <div>
            <Link 
              to={`/profile/${post.author_details.username}`} 
              className="font-semibold text-slate-900 hover:text-blue-600 transition-colors duration-300"
            >
              {post.author_details.username}
            </Link>
            <p className="text-xs text-slate-500 flex items-center mt-1">
              <span className="w-1 h-1 bg-slate-400 rounded-full mr-2"></span>
              {formattedDate}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-300"
            disabled={isDeleting}
          >
            <EllipsisHorizontalIcon className="h-5 w-5" />
          </button>
          
          {showOptions && (
            <div className="absolute right-0 z-10 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 py-2">
              {isAuthor && (
                <button 
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  {isDeleting ? '删除中...' : '删除贴文'}
                </button>
              )}
              <button 
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100/50 transition-colors duration-200"
                onClick={handleReport}
              >
                举报贴文
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 贴文内容 */}
      <div className="p-6">
        {/* 文字内容 */}
        <p className="text-slate-800 mb-4 whitespace-pre-line leading-relaxed">{post.content}</p>
        
        {/* 媒体内容 */}
        {post.media && post.media.length > 0 && (
          <div className="relative mb-4 rounded-xl overflow-hidden">
            {post.media[currentMediaIndex].media_type === 'image' ? (
              <img 
                src={post.media[currentMediaIndex].file} 
                alt="Post media" 
                className="w-full h-auto max-h-96 object-cover"
              />
            ) : (
              <video 
                src={post.media[currentMediaIndex].file} 
                className="w-full h-auto max-h-96 object-cover" 
                controls 
              />
            )}
            
            {/* 媒体导航 */}
            {post.media.length > 1 && (
              <>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {post.media.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentMediaIndex 
                          ? 'bg-white scale-125' 
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
                
                {/* 媒体翻页按钮 */}
                {currentMediaIndex > 0 && (
                  <button
                    onClick={prevMedia}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-300 backdrop-blur-sm"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                )}
                {currentMediaIndex < post.media.length - 1 && (
                  <button
                    onClick={nextMedia}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-300 backdrop-blur-sm"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
        
        {/* 代码内容 */}
        {post.code_snippet && (
          <div className="mb-4 relative">
            <div className="flex justify-between items-center mb-3 p-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-t-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <CodeBracketIcon className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">代码片段</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={copyCode}
                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-300"
                >
                  复制代码
                </button>
                <button
                  onClick={() => setExpandCode(!expandCode)}
                  className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-300"
                >
                  {expandCode ? '收起' : '展开'}
                </button>
              </div>
            </div>
            <div className={`relative rounded-b-xl overflow-hidden border border-t-0 border-slate-200 ${
              expandCode ? '' : 'max-h-48'
            }`}>
              <SyntaxHighlighter
                language="javascript" // 这里应该根据后端返回的语言类型来设置
                style={atomDark}
                customStyle={{ 
                  margin: 0, 
                  padding: '1.5rem',
                  borderRadius: '0 0 0.75rem 0.75rem',
                }}
              >
                {post.code_snippet}
              </SyntaxHighlighter>
              {!expandCode && post.code_snippet.split('\n').length > 10 && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 贴文互动按钮 */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleLike} 
              className={`group flex items-center space-x-2 transition-all duration-300 hover:scale-110 ${
                isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
              }`}
            >
              {isLiked ? (
                <HeartIconSolid className="h-5 w-5 animate-pulse" />
              ) : (
                <HeartIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              )}
              <span className="text-sm font-medium">{likesCount > 0 && likesCount}</span>
            </button>
            
            <Link 
              to={`/post/${post.id}`} 
              className="group flex items-center space-x-2 text-slate-500 hover:text-blue-500 transition-all duration-300 hover:scale-110"
            >
              <ChatBubbleLeftEllipsisIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm font-medium">{post.comments_count > 0 && post.comments_count}</span>
            </Link>
            
            <button className="group flex items-center space-x-2 text-slate-500 hover:text-green-500 transition-all duration-300 hover:scale-110">
              <ArrowPathIcon className="h-5 w-5 group-hover:scale-110 group-hover:rotate-180 transition-all duration-300" />
              <span className="text-sm font-medium">{post.shares_count > 0 && post.shares_count}</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleSave} 
              className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
                isSaved 
                  ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' 
                  : 'text-slate-500 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
            >
              {isSaved ? (
                <BookmarkIconSolid className="h-5 w-5" />
              ) : (
                <BookmarkIcon className="h-5 w-5" />
              )}
            </button>
            
            <button 
              onClick={handleShare} 
              className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard; 