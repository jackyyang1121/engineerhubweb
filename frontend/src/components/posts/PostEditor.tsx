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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-in-up">
        {/* 頭部 */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
          <div className="flex items-center space-x-3">
            <DocumentPlusIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">創建新貼文</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                {/* 使用者頭像 */}
                <div className="relative">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=gradient`}
                    alt={user?.username || '使用者'}
                    className="h-12 w-12 rounded-xl object-cover border-2 border-white shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                
                {/* 內容輸入區 */}
                <div className="flex-1">
                  <textarea
                    {...register('content')}
                    rows={4}
                    placeholder="分享你的想法、經驗或問題..."
                    className="w-full p-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 resize-none text-slate-800 placeholder-slate-500"
                  />
                  {errors.content && (
                    <p className="mt-2 text-sm text-red-500 animate-slide-in-down">{errors.content.message}</p>
                  )}
                  
                  {/* 程式碼編輯器 */}
                  {showCodeEditor && (
                    <div className="mt-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                        <div className="flex items-center space-x-3">
                          <CodeBracketIcon className="h-5 w-5 text-slate-600" />
                          <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1 text-slate-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all duration-200"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="relative">
                        <CodeEditor
                          language={language}
                          value={code}
                          onChange={setCode}
                          placeholder="// 在此輸入程式碼..."
                        />
                        <div className="bg-slate-50 px-4 py-2 text-xs text-right text-slate-500 border-t border-slate-200">
                          {code.length}/{MAX_CODE_LENGTH} 字符
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 媒體預覽區 */}
                  {mediaPreviewUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {mediaPreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          {mediaFiles[index].type.startsWith('image/') ? (
                            <img 
                              src={url} 
                              alt={`媒體 ${index + 1}`} 
                              className="h-32 w-full object-cover rounded-xl border border-slate-200"
                            />
                          ) : (
                            <video 
                              src={url} 
                              className="h-32 w-full object-cover rounded-xl border border-slate-200" 
                              controls
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMediaFile(index)}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all duration-200"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 底部工具欄 */}
          <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-slate-50/80 via-white/80 to-slate-50/80 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                {/* 媒體上傳按鈕 */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mediaFiles.length >= MAX_MEDIA_COUNT}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    mediaFiles.length >= MAX_MEDIA_COUNT 
                    ? 'text-slate-400 cursor-not-allowed bg-slate-100' 
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
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
                <button
                  type="button"
                  onClick={toggleCodeEditor}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    showCodeEditor 
                      ? 'text-blue-600 bg-blue-100' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title={showCodeEditor ? '關閉程式碼編輯器' : '添加程式碼'}
                >
                  <CodeBracketIcon className="h-5 w-5" />
                </button>
              </div>
              
              {/* 字數統計和發布按鈕 */}
              <div className="flex items-center space-x-4">
                <div className="text-xs text-slate-500">
                  {content.length}/500 字符
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || (!content.trim() && !code && mediaFiles.length === 0)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform ${
                    isSubmitting || (!content.trim() && !code && mediaFiles.length === 0)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>發布中...</span>
                    </div>
                  ) : (
                    '發布貼文'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostEditor; 