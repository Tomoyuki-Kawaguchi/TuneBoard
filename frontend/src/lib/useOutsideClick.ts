import { useEffect } from "react";

export const useOutsideClick = ({ref, callback}: { ref: React.RefObject<HTMLElement | null>; callback: () => void }) => {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref?.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, callback]);
}