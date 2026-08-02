import React from 'react';
import ReactMarkdown from 'react-markdown';

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`message message--${message.role}`}>
      <div className="message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <>
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && <span className="streaming-cursor"></span>}
          </>
        )}
      </div>
      
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="sources-container">
          {message.sources.map((source, idx) => (
            <div key={idx} className="source-badge" title={source.text_content}>
              Page {source.page_number} · {source.filename}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
