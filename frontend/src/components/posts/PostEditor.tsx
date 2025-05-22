import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { CodeBracketIcon, XMarkIcon, PhotoIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import * as postApi from '../../api/postApi';
import type { CreatePostData } from '../../api/postApi';
import CodeEditor from './CodeEditor';

interface PostEditorProps {
  onClose?: () => void;
  onPostCreated?: () => void;
}

// 可上傳的媒體檔案類型
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
const MAX_MEDIA_COUNT = 10; // 最多上傳10個媒體檔案
const MAX_CODE_LENGTH = 2000; // 最多2000字元的程式碼

interface FormData {
  content: string;
}

const PostEditor: React.FC<PostEditorProps> = ({ onClose, onPostCreated }) => {
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(state => state.user);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const content = watch('content', '');

  // 處理媒體檔案上傳
  const handleMediaUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 檢查是否超過最大數量
    if (mediaFiles.length + files.length > MAX_MEDIA_COUNT) {
      toast.error(`最多只能上傳 ${MAX_MEDIA_COUNT} 個媒體檔案`);
      return;
    }
    
    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];
    
    Array.from(files).forEach(file => {
      // 檢查檔案類型
      if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
        toast.error(`不支援的檔案類型：${file.type}`);
        return;
      }
      
      newFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    });
    
    setMediaFiles([...mediaFiles, ...newFiles]);
    setMediaPreviewUrls([...mediaPreviewUrls, ...newPreviewUrls]);
  };

  // 移除媒體檔案
  const removeMediaFile = (index: number) => {
    URL.revokeObjectURL(mediaPreviewUrls[index]); // 釋放URL資源
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviewUrls(mediaPreviewUrls.filter((_, i) => i !== index));
  };

  // 切換程式碼編輯器顯示
  const toggleCodeEditor = () => {
    setShowCodeEditor(!showCodeEditor);
  };

  // 提交貼文
  const onSubmit = async (data: FormData) => {
    if (!data.content.trim() && !code && mediaFiles.length === 0) {
      toast.error('請輸入貼文內容、程式碼或上傳媒體檔案');
      return;
    }

    if (code && code.length > MAX_CODE_LENGTH) {
      toast.error(`程式碼長度不能超過 ${MAX_CODE_LENGTH} 個字元`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const postData: CreatePostData = {
        content: data.content,
        code_snippet: code || undefined,
        media: mediaFiles
      };
      
      await postApi.createPost(postData);
      toast.success('貼文發布成功！');
      
      // 清空表單並關閉編輯器
      if (onPostCreated) onPostCreated();
      if (onClose) onClose();
    } catch (error) {
      toast.error('發布貼文失敗，請重試');
      console.error('發布貼文錯誤:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium">建立貼文</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* 使用者頭像 */}
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=random`}
              alt={user?.username || '使用者'}
              className="h-10 w-10 rounded-full"
            />
            
            {/* 內容輸入區 */}
            <div className="flex-1">
              <textarea
                {...register('content')}
                rows={4}
                placeholder="有什麼想法？"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
              
              {/* 程式碼編輯器 */}
              {showCodeEditor && (
                <div className="mt-4 border border-gray-300 rounded-md overflow-hidden">
                  <div className="bg-gray-100 p-2 flex justify-between items-center">
                    <div className="flex items-center">
                      <CodeBracketIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="text-sm border-0 bg-transparent text-gray-600 focus:ring-0"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="cpp">C++</option>
                        <option value="php">PHP</option>
                        <option value="ruby">Ruby</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                        <option value="typescript">TypeScript</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="sql">SQL</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={toggleCodeEditor}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <CodeEditor
                    language={language}
                    value={code}
                    onChange={setCode}
                    placeholder="// 在此輸入程式碼..."
                  />
                  <div className="bg-gray-50 p-2 text-xs text-right text-gray-500">
                    {code.length}/{MAX_CODE_LENGTH}
                  </div>
                </div>
              )}
              
              {/* 媒體預覽區 */}
              {mediaPreviewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mediaPreviewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      {mediaFiles[index].type.startsWith('image/') ? (
                        <img 
                          src={url} 
                          alt={`媒體 ${index + 1}`} 
                          className="h-32 w-full object-cover rounded-md"
                        />
                      ) : (
                        <video 
                          src={url} 
                          className="h-32 w-full object-cover rounded-md" 
                          controls
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaFile(index)}
                        className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 text-white rounded-full p-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 底部工具欄 */}
        <div className="px-4 py-3 bg-gray-50 flex justify-between">
          <div className="flex space-x-2">
            {/* 媒體上傳按鈕 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= MAX_MEDIA_COUNT}
              className={`p-2 rounded-full ${
                mediaFiles.length >= MAX_MEDIA_COUNT 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-500 hover:bg-gray-100'
              }`}
              title={mediaFiles.length >= MAX_MEDIA_COUNT ? `最多上傳 ${MAX_MEDIA_COUNT} 個媒體檔案` : '上傳媒體'}
            >
              <PhotoIcon className="h-5 w-5" />
              <input
                type="file"
                ref={fileInputRef}
                accept={ALLOWED_MEDIA_TYPES.join(',')}
                multiple
                onChange={handleMediaUpload}
                className="hidden"
              />
            </button>
            
            {/* 程式碼按鈕 */}
            {!showCodeEditor && (
              <button
                type="button"
                onClick={toggleCodeEditor}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                title="添加程式碼"
              >
                <CodeBracketIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* 發布按鈕 */}
          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && !code && mediaFiles.length === 0)}
            className={`px-4 py-2 rounded-full ${
              isSubmitting || (!content.trim() && !code && mediaFiles.length === 0)
                ? 'bg-primary-300 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            } text-white font-medium`}
          >
            {isSubmitting ? '發布中...' : '發布'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostEditor; 