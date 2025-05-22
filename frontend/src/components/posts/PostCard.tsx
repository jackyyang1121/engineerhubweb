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
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';

import type { Post } from '../../api/postApi';
import * as postApi from '../../api/postApi';

interface PostCardProps {  post: Post;  onPostUpdated?: () => void;  onPostDeleted?: () => void;  isDetailView?: boolean;}

const PostCard: React.FC<PostCardProps> = ({   post,   onPostUpdated,   onPostDeleted,  isDetailView = false }) => {
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [isSaved, setIsSaved] = useState(post.is_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [expandCode, setExpandCode] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  
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
    <div className="card mb-4">
      {/* 贴文头部信息 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center">
          <Link to={`/profile/${post.author_details.username}`}>
            <img
              src={post.author_details.avatar || `https://ui-avatars.com/api/?name=${post.author_details.username}&background=random`}
              alt={post.author_details.username}
              className="w-10 h-10 rounded-full mr-3"
            />
          </Link>
          <div>
            <Link 
              to={`/profile/${post.author_details.username}`} 
              className="font-medium text-gray-900 hover:text-primary-600"
            >
              {post.author_details.username}
            </Link>
            <p className="text-xs text-gray-500">{formattedDate}</p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="text-gray-400 hover:text-gray-600"
          >
            <EllipsisHorizontalIcon className="h-6 w-6" />
          </button>
          
          {showOptions && (
            <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
              <button 
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleReport}
              >
                举报贴文
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 贴文内容 */}
      <div className="p-4">
        {/* 文字内容 */}
        <p className="text-gray-900 mb-3 whitespace-pre-line">{post.content}</p>
        
        {/* 媒体内容 */}
        {post.media && post.media.length > 0 && (
          <div className="relative mb-3">
            {post.media[currentMediaIndex].media_type === 'image' ? (
              <img 
                src={post.media[currentMediaIndex].file} 
                alt="Post media" 
                className="w-full rounded-lg"
              />
            ) : (
              <video 
                src={post.media[currentMediaIndex].file} 
                className="w-full rounded-lg" 
                controls 
              />
            )}
            
            {/* 媒体导航 */}
            {post.media.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                {post.media.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={`mx-1 w-2 h-2 rounded-full ${
                      index === currentMediaIndex ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
            
            {/* 媒体翻页按钮 */}
            {post.media.length > 1 && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    onClick={prevMedia}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1 shadow"
                  >
                    &lt;
                  </button>
                )}
                {currentMediaIndex < post.media.length - 1 && (
                  <button
                    onClick={nextMedia}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1 shadow"
                  >
                    &gt;
                  </button>
                )}
              </>
            )}
          </div>
        )}
        
        {/* 代码内容 */}
        {post.code_snippet && (
          <div className="mb-3 relative">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <CodeBracketIcon className="h-5 w-5 text-gray-500 mr-1" />
                <span className="text-sm text-gray-500">代码片段</span>
              </div>
              <div className="flex items-center">
                <button
                  onClick={copyCode}
                  className="text-xs text-primary-600 hover:text-primary-700 mr-2"
                >
                  复制代码
                </button>
                <button
                  onClick={() => setExpandCode(!expandCode)}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {expandCode ? '收起' : '展开'}
                </button>
              </div>
            </div>
            <div className={`code-block overflow-hidden rounded-md ${expandCode ? '' : 'max-h-48'}`}>
              <SyntaxHighlighter
                language="javascript" // 这里应该根据后端返回的语言类型来设置
                style={atomDark}
                customStyle={{ margin: 0, padding: '1rem' }}
              >
                {post.code_snippet}
              </SyntaxHighlighter>
            </div>
            {!expandCode && post.code_snippet.split('\n').length > 10 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent opacity-80"></div>
            )}
          </div>
        )}
      </div>
      
      {/* 贴文互动按钮 */}
      <div className="px-4 py-2 border-t border-gray-100 flex justify-between">
        <div className="flex space-x-4">
          <button 
            onClick={handleLike} 
            className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
          >
            {isLiked ? <HeartIconSolid className="h-5 w-5" /> : <HeartIcon className="h-5 w-5" />}
            <span className="text-sm">{likesCount > 0 && likesCount}</span>
          </button>
          
          <Link 
            to={`/post/${post.id}`} 
            className="flex items-center space-x-1 text-gray-500 hover:text-primary-500"
          >
            <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
            <span className="text-sm">{post.comments_count > 0 && post.comments_count}</span>
          </Link>
          
          <button className="flex items-center space-x-1 text-gray-500 hover:text-green-500">
            <ArrowPathIcon className="h-5 w-5" />
            <span className="text-sm">{post.shares_count > 0 && post.shares_count}</span>
          </button>
        </div>
        
        <div className="flex space-x-4">
          <button 
            onClick={handleSave} 
            className={`${isSaved ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}
          >
            {isSaved ? <BookmarkIconSolid className="h-5 w-5" /> : <BookmarkIcon className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={handleShare} 
            className="text-gray-500 hover:text-primary-500"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard; 