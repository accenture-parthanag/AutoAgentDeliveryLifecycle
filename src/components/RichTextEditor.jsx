import React, { useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor = React.memo(({ value, onChange, placeholder, readOnly = false }) => {
  const modules = useMemo(() => ({
    toolbar: readOnly ? false : [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean']
    ]
  }), [readOnly]);

  const formats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'list', 'bullet',
    'link'
  ], []);

  const handleChange = useCallback((content) => {
    onChange(content);
  }, [onChange]);

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
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ minHeight: '200px' }}
      />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
