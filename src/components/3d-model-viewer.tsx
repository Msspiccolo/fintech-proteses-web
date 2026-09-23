import React, { useEffect } from "react";

// Register custom element types for TypeScript
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "auto-rotate"?: boolean;
          "camera-controls"?: boolean;
          ar?: boolean;
          poster?: string;
          style?: React.CSSProperties;
          exposure?: string;
          "shadow-intensity"?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface ModelViewerProps {
  src: string;
  alt?: string;
  poster?: string;
  className?: string;
}

export function ModelViewer({ src, alt = "Um modelo 3D", poster, className = "" }: ModelViewerProps) {
  useEffect(() => {
    // Dynamically import the model-viewer web component
    import("@google/model-viewer").catch((err) => {
      console.warn("Failed to load model-viewer, maybe it's already registered", err);
    });
  }, []);

  return (
    <div className={`relative w-full h-[400px] overflow-hidden rounded-xl border bg-muted/30 ${className}`}>
      <model-viewer
        src={src}
        alt={alt}
        poster={poster}
        auto-rotate
        camera-controls
        ar
        exposure="1"
        shadow-intensity="1"
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      />
    </div>
  );
}
