import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function RichTextEditor({ value, onChange, placeholder, readOnly = false }) {
  const modules = {
    toolbar: readOnly ? false : [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'list', 'bullet',
    'link'
  ];

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--outline-variant)',
      borderRadius: '0px',
      overflow: 'hidden'
    }}>
      <ReactQuill
        theme={readOnly ? 'bubble' : 'snow'}
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ minHeight: '200px' }}
      />
    </div>
  );
}
