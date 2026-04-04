import { useState, useEffect } from "react";
import { store } from "./store.js";

/**
 * Subscribes to the pipeline store and re-renders on change.
 * @returns {import("./store.js").PipelineStore["state"]}
 */
export function useStore() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handleChange = () => forceRender((n) => n + 1);
    store.on("change", handleChange);
    return () => store.off("change", handleChange);
  }, []);

  return store.getState();
}
