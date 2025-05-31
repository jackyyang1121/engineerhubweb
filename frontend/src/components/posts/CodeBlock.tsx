/**
 * 程式碼區塊組件
 * 
 * 功能：
 * 1. 程式碼語法高亮顯示
 * 2. 一鍵複製程式碼
 * 3. 可展開/收起長程式碼
 * 4. 顯示程式語言標籤
 */

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  ClipboardIcon, 
  ClipboardDocumentCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon 
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

interface CodeBlockProps {
  code: string;
  language?: string;
  maxLines?: number;
  showLineNumbers?: boolean;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  maxLines = 10,
  showLineNumbers = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 處理程式碼複製
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      toast.success('程式碼已複製到剪貼板');
      
      // 3秒後重置複製狀態
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch {
      toast.error('複製失敗，請手動選擇複製');
    }
  };

  // 計算程式碼行數
  const codeLines = code.split('\n');
  const shouldTruncate = codeLines.length > maxLines;
  const displayCode = shouldTruncate && !isExpanded 
    ? codeLines.slice(0, maxLines).join('\n')
    : code;

  // 獲取語言顯示名稱
  const getLanguageDisplayName = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'csharp': 'C#',
      'php': 'PHP',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'html': 'HTML',
      'css': 'CSS',
      'sql': 'SQL',
      'json': 'JSON',
      'yaml': 'YAML',
      'markdown': 'Markdown',
      'bash': 'Bash',
      'shell': 'Shell'
    };
    
    return languageMap[lang] || lang.toUpperCase();
  };

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* 程式碼標題欄 */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <span className="text-sm text-gray-300 font-medium">
            {getLanguageDisplayName(language)}
          </span>
          {shouldTruncate && (
            <span className="text-xs text-gray-500">
              ({codeLines.length} 行)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 展開/收起按鈕 */}
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  <span>收起</span>
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  <span>展開</span>
                </>
              )}
            </button>
          )}
          
          {/* 複製按鈕 */}
          <button
            onClick={handleCopyCode}
            className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isCopied ? (
              <>
                <ClipboardDocumentCheckIcon className="w-4 h-4 text-green-400" />
                <span className="text-green-400">已複製</span>
              </>
            ) : (
              <>
                <ClipboardIcon className="w-4 h-4" />
                <span>複製</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 程式碼內容 */}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={atomDark}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#6b7280',
            fontSize: '12px'
          }}
        >
          {displayCode}
        </SyntaxHighlighter>
        
        {/* 收起狀態下的漸變遮罩 */}
        {shouldTruncate && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>
      
      {/* 展開提示 */}
      {shouldTruncate && !isExpanded && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => setIsExpanded(true)}
            className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-full hover:bg-gray-600 transition-colors"
          >
            顯示完整程式碼
          </button>
        </div>
      )}
    </div>
  );
};

export default CodeBlock; 