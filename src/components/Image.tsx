import { useState, useEffect } from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackUrls?: string[];
  fallbackSrc?: string;
}

export function Image({
  src,
  fallbackUrls = [],
  fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMjAgMEgwVjgwSDEyMFYwWiIgZmlsbD0iI2UzZTNlMyIvPjxwYXRoIGQ9Ik02MCAyMEM1MS43MTU3IDIwIDQ1IDI2LjcxNTcgNDUgMzVDNDUgNDMuMjg0MyA1MS43MTU3IDUwIDYwIDUwQzY4LjI4NDMgNTAgNzUgNDMuMjg0MyA3NSAzNUM3NSAyNi43MTU3IDY4LjI4NDMgMjAgNjAgMjBaIiBmaWxsPSIjOWU5ZTllIi8+PHBhdGggZD0iTTIwIDYwVjUwTDQwIDM1TDUwIDQ1TDgwIDIwTDEwMCA0MFY2MEgyMFoiIGZpbGw9IiM5ZTllOWUiLz48L3N2Zz4=',
  alt,
  loading = 'lazy',
  ...props
}: ImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setFallbackIndex(0);
  }, [src]);

  const handleError = () => {
    if (fallbackIndex < fallbackUrls.length) {
      setCurrentSrc(fallbackUrls[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    } else {
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={handleError}
      loading={loading}
      {...props}
    />
  );
}
