import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  toDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface Props { height?: number; initial?: string | null; }

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { height = 180, initial = null }, ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [empty, setEmpty] = useState(!initial);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2;
    ctx.strokeStyle = "#111";
    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initial;
    }
  }, [initial]);

  const getPt = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPt.current = getPt(e);
    setEmpty(false);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPt(e);
    ctx.beginPath(); ctx.moveTo(lastPt.current!.x, lastPt.current!.y);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    lastPt.current = p;
  };
  const end = () => { drawing.current = false; lastPt.current = null; };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  useImperativeHandle(ref, () => ({
    toDataURL: () => (empty ? null : canvasRef.current!.toDataURL("image/png")),
    clear,
    isEmpty: () => empty,
  }));

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-white touch-none" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          <Eraser className="mr-1 h-3 w-3" /> Limpar
        </Button>
      </div>
    </div>
  );
});
