import React from 'react';
import { Trash2 } from 'lucide-react';
import FileUpload from './FileUpload';

const Sidebar = ({ documents, onRefresh, apiUrl }) => {
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/api/documents/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <aside className="sidebar">
      <FileUpload onRefresh={onRefresh} apiUrl={apiUrl} />
      
      <div className="document-list">
        {documents.map((doc) => (
          <div key={doc.id} className="document-item">
            <span className="document-name" title={doc.filename}>
              {doc.filename}
            </span>
            <button 
              className="document-delete" 
              onClick={() => handleDelete(doc.id)}
              aria-label="Delete document"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {documents.length === 0 && (
          <div style={{ padding: 'var(--lg-space-4)', color: 'var(--lg-text-secondary)', textAlign: 'center', fontSize: 'var(--lg-font-size-2)' }}>
            No documents uploaded yet.
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
