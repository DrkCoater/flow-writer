import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Hook to load context document from hardcoded XML file
 * @returns {Object} Document data and loading state
 */
export function useContextDocument() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // Hardcoded file path for MVP
        const filePath = 'src-tauri/context-docs/context-example.xml';
        const secs = await invoke('load_sections', { filePath });
        setSections(secs);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, []);

  return { sections, loading, error };
}
