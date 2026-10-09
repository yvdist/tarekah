import { useState } from "react";

// A key that changes every time `open` turns true. Put it on the content of a
// dialog so each opening starts from fresh state: the dialog popup itself can
// outlive a close.
export function useOpenKey(open: boolean) {
  const [wasOpen, setWasOpen] = useState(open);
  const [key, setKey] = useState(0);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setKey(key + 1);
    }
  }

  return key;
}
