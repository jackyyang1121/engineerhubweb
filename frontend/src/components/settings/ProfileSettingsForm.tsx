import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { PencilIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';

import { useAuthStore } from '../../store/authStore';
import * as userApi from '../../api/userApi';

const ProfileSettingsForm = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [skillTags, setSkillTags] = useState<string[]>(user?.skill_tags || []);
  const [newTag, setNewTag] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 更新個人資料的mutation
  const updateProfileMutation = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (updatedUser) => {
      // 更新全局用戶數據
      updateUser(updatedUser);
      // 更新緩存的用戶數據
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('個人資料已更新');
    },
    onError: (error) => {
      toast.error('更新個人資料失敗，請重試');
      console.error('更新個人資料錯誤:', error);
    }
  });
  
  // 點擊頭像觸發文件選擇
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  // 處理頭像選擇
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 檢查文件類型
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
      toast.error('請上傳有效的圖片格式 (JPEG, PNG, GIF)');
      return;
    }
    
    // 檢查文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('圖片大小不能超過 5MB');
      return;
    }
    
    setAvatar(file);
    
    // 創建預覽
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 表單驗證
    if (!username.trim()) {
      toast.error('用戶名不能為空');
      return;
    }
    
    // 創建表單數據
    const formData = new FormData();
    formData.append('username', username);
    formData.append('bio', bio);
    if (avatar) {
      formData.append('avatar', avatar);
    }
    skillTags.forEach((tag) => {
      formData.append('skill_tags', tag);
    });
    
    updateProfileMutation.mutate(formData);
  };
  
  // 添加技能標籤
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;
    
    // 檢查是否已存在
    if (skillTags.includes(trimmedTag)) {
      toast.error('此技能標籤已存在');
      return;
    }
    
    // 限制標籤數量
    if (skillTags.length >= 10) {
      toast.error('最多只能添加 10 個技能標籤');
      return;
    }
    
    setSkillTags([...skillTags, trimmedTag]);
    setNewTag('');
  };
  
  // 刪除技能標籤
  const handleRemoveTag = (tagToRemove: string) => {
    setSkillTags(skillTags.filter(tag => tag !== tagToRemove));
  };
  
  // 使用 Enter 鍵添加標籤
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">個人資料設置</h2>
      
      {/* 頭像上傳 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          頭像
        </label>
        <div className="flex items-center space-x-4">
          <div 
            className="relative cursor-pointer group"
            onClick={handleAvatarClick}
          >
            <img
              src={avatarPreview || `https://ui-avatars.com/api/?name=${username || 'User'}&background=random&size=200`}
              alt="頭像"
              className="w-24 h-24 rounded-full object-cover border border-gray-200"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <PencilIcon className="h-6 w-6 text-white" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
            />
          </div>
          <div className="text-sm text-gray-500">
            <p>點擊頭像進行更換</p>
            <p>支持 JPEG, PNG, GIF 格式，最大 5MB</p>
          </div>
        </div>
      </div>
      
      {/* 用戶名 */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          用戶名 *
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input w-full"
          placeholder="你的用戶名"
          required
        />
      </div>
      
      {/* 個人簡介 */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          個人簡介
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="input w-full min-h-[120px]"
          placeholder="簡短介紹自己，突出你的專業技能和興趣"
          maxLength={200}
        />
        <div className="mt-1 text-xs text-gray-500 text-right">
          {bio.length}/200
        </div>
      </div>
      
      {/* 技能標籤 */}
      <div>
        <label htmlFor="skill-tags" className="block text-sm font-medium text-gray-700 mb-1">
          技能標籤
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {skillTags.map((tag, index) => (
            <div 
              key={index}
              className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full flex items-center"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-primary-700 hover:text-primary-800"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          {skillTags.length === 0 && (
            <p className="text-sm text-gray-500">
              添加描述你技能的標籤，如「React」、「Python」、「UI 設計」等
            </p>
          )}
        </div>
        <div className="flex">
          <input
            id="skill-tags"
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            className="input flex-grow"
            placeholder="添加技能標籤"
            disabled={skillTags.length >= 10}
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!newTag.trim() || skillTags.length >= 10}
            className="ml-2 btn-primary py-2 px-4 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            添加
          </button>
        </div>
        {skillTags.length >= 10 && (
          <p className="mt-1 text-xs text-red-500">
            已達到最大標籤數量限制 (10 個)
          </p>
        )}
      </div>
      
      {/* 提交按鈕 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateProfileMutation.isPending}
          className="btn-primary py-2 px-6"
        >
          {updateProfileMutation.isPending ? '保存中...' : '保存變更'}
        </button>
      </div>
    </form>
  );
};

export default ProfileSettingsForm; 