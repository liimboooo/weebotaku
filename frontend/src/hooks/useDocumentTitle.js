import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} | Otaku`;
    return () => { document.title = prev; };
  }, [title]);
}
