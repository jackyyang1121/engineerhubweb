import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  value,
  onChange,
  placeholder = '// 輸入程式碼...'
}) => {
  // 當文字區域內容變更時的處理函數
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      {/* 顯示的語法高亮區域，這個區域只用於顯示，不可互動 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <SyntaxHighlighter
          language={language}
          style={atomDark}
          wrapLines={true}
          customStyle={{
            margin: 0,
            padding: '0.5rem',
            background: 'transparent',
            height: '100%',
          }}
          lineProps={{
            style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' }
          }}
        >
          {value || ' '}
        </SyntaxHighlighter>
      </div>

      {/* 實際的輸入區域，透明背景以便顯示底層的語法高亮 */}
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="bg-transparent text-transparent caret-white w-full h-48 p-2 resize-none focus:outline-none focus:ring-0 focus:border-transparent"
        style={{
          fontFamily: 'Fira Code, monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          zIndex: 1,
          position: 'relative',
        }}
      />
    </div>
  );
};

export default CodeEditor; 