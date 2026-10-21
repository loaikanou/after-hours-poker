import { useEffect } from "react";

type Meta = { title: string; description?: string; noindex?: boolean };

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.append(tag);
  }
  tag.content = content;
}

/**
 * Per-screen <title>, description and robots directive. Private table screens
 * are marked noindex so a shared invite link never ends up in search results.
 */
export function useDocumentMeta({ title, description, noindex = false }: Meta) {
  useEffect(() => {
    document.title = title;
    if (description) setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
  }, [title, description, noindex]);
}
