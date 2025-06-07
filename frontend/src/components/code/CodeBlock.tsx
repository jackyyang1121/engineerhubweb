/**
 * 程式碼區塊組件
 * 支援語法高亮顯示、語言自動檢測、一鍵複製功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardDocumentIcon, 
  CheckIcon, 
  CodeBracketIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { logger } from '../../utils/logger';

// 支援的程式語言列表
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'dart', 'scala',
  'html', 'css', 'scss', 'sql', 'bash', 'shell', 'json', 'yaml',
  'markdown', 'dockerfile', 'plaintext'
] as const;

type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 程式碼區塊屬性
interface CodeBlockProps {
  code: string;                          // 程式碼內容
  language?: SupportedLanguage | string; // 程式語言
  showLineNumbers?: boolean;             // 是否顯示行號
  maxHeight?: number;                    // 最大高度（像素）
  collapsible?: boolean;                 // 是否可摺疊
  initialCollapsed?: boolean;            // 初始是否摺疊
  theme?: 'light' | 'dark';             // 主題
  onCopy?: (code: string) => void;      // 複製回調
  className?: string;                    // 自定義樣式類
}

// 語言映射（用於顯示友好名稱）
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  dart: 'Dart',
  scala: 'Scala',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sql: 'SQL',
  bash: 'Bash',
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  markdown: 'Markdown',
  dockerfile: 'Dockerfile',
  plaintext: 'Plain Text'
};

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'plaintext',
  showLineNumbers = true,
  maxHeight = 400,
  collapsible = true,
  initialCollapsed = false,
  theme = 'dark',
  onCopy,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);          // 複製狀態
  const [collapsed, setCollapsed] = useState(initialCollapsed); // 摺疊狀態
  const [detectedLanguage, setDetectedLanguage] = useState(language); // 檢測到的語言

  // 計算程式碼行數
  const lines = code.split('\n');
  const lineCount = lines.length;

  // 檢測程式語言（簡單實現）
  useEffect(() => {
    if (language === 'auto' || !language) {
      // 簡單的語言檢測邏輯
      const detected = detectLanguage(code);
      setDetectedLanguage(detected);
      logger.debug('post', `自動檢測程式語言: ${detected}`);
    } else {
      setDetectedLanguage(language);
    }
  }, [code, language]);

  // 複製程式碼
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      logger.info('user', '程式碼已複製到剪貼簿');
      
      // 調用回調
      onCopy?.(code);
      
      // 3秒後重置複製狀態
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      logger.error('error', '複製程式碼失敗', error);
    }
  }, [code, onCopy]);

  // 切換摺疊狀態
  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  // 判斷是否需要摺疊功能
  const shouldShowCollapse = collapsible && lineCount > 10;

  // 獲取主題樣式
  const themeClasses = theme === 'dark'
    ? 'bg-gray-900 text-gray-100 border-gray-700'
    : 'bg-gray-50 text-gray-900 border-gray-300';

  // 自定義樣式
  const customStyle = {
    margin: 0,
    padding: 0,
    background: 'transparent',
    fontSize: '0.875rem',
    lineHeight: '1.5rem'
  };

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      {/* 標題欄 */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${themeClasses}`}>
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {LANGUAGE_DISPLAY_NAMES[detectedLanguage] || detectedLanguage}
          </span>
          <span className="text-xs text-gray-500">
            {lineCount} 行
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 摺疊按鈕 */}
          {shouldShowCollapse && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={collapsed ? '展開' : '收起'}
            >
              {collapsed ? (
                <ArrowsPointingOutIcon className="w-4 h-4" />
              ) : (
                <ArrowsPointingInIcon className="w-4 h-4" />
              )}
            </button>
          )}
          
          {/* 複製按鈕 */}
          <button
            onClick={handleCopy}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded text-sm
              transition-all duration-200
              ${copied 
                ? 'bg-green-600 text-white' 
                : 'hover:bg-gray-700 text-gray-300'
              }
            `}
            disabled={copied}
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>已複製</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-4 h-4" />
                <span>複製</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 程式碼區域 */}
      <div 
        className={`
          ${themeClasses} 
          ${collapsed ? 'max-h-32' : ''} 
          overflow-auto
        `}
        style={{ maxHeight: collapsed ? undefined : `${maxHeight}px` }}
      >
        <SyntaxHighlighter
          language={detectedLanguage}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          customStyle={customStyle}
          codeTagProps={{
            style: {
              fontSize: '0.875rem',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* 摺疊提示 */}
      {shouldShowCollapse && collapsed && (
        <div 
          className={`
            absolute bottom-0 left-0 right-0 h-12 
            bg-gradient-to-t from-gray-900 to-transparent 
            flex items-end justify-center pb-2 cursor-pointer
          `}
          onClick={toggleCollapse}
        >
          <span className="text-xs text-gray-400">
            點擊展開全部程式碼
          </span>
        </div>
      )}
    </div>
  );
};

// 簡單的語言檢測函數
function detectLanguage(code: string): SupportedLanguage {
  // 檢查特定的語法模式
  const patterns: Array<[RegExp, SupportedLanguage]> = [
    [/^import .+ from ['"]/, 'javascript'],
    [/^from .+ import/, 'python'],
    [/^package .+;/, 'java'],
    [/^#include <.+>/, 'cpp'],
    [/^using System;/, 'csharp'],
    [/^package main/, 'go'],
    [/^fn main\(\)/, 'rust'],
    [/<\?php/, 'php'],
    [/^class .+ extends Component/, 'javascript'],
    [/^interface .+ {/, 'typescript'],
    [/^<!DOCTYPE html>/, 'html'],
    [/^@import/, 'scss'],
    [/^SELECT .+ FROM/i, 'sql'],
    [/^FROM .+/i, 'dockerfile'],
  ];

  for (const [pattern, lang] of patterns) {
    if (pattern.test(code.trim())) {
      return lang;
    }
  }

  // 檢查文件擴展名提示
  const firstLine = code.split('\n')[0];
  if (firstLine.includes('.js') || firstLine.includes('.jsx')) return 'javascript';
  if (firstLine.includes('.ts') || firstLine.includes('.tsx')) return 'typescript';
  if (firstLine.includes('.py')) return 'python';
  if (firstLine.includes('.java')) return 'java';
  if (firstLine.includes('.cpp') || firstLine.includes('.cc')) return 'cpp';
  if (firstLine.includes('.go')) return 'go';
  if (firstLine.includes('.rs')) return 'rust';

  return 'plaintext';
}

// 匯出工具函數
export { detectLanguage, SUPPORTED_LANGUAGES, LANGUAGE_DISPLAY_NAMES };