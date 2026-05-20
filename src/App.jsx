import { useRef, useEffect } from "react";

function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let spraying = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const spray = (x, y) => {
      const radius = 25;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(0,255,200,0.8)");
      gradient.addColorStop(1, "rgba(0,255,200,0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    canvas.addEventListener("mousedown", () => (spraying = true));
    canvas.addEventListener("mouseup", () => (spraying = false));
    canvas.addEventListener("mouseleave", () => (spraying = false));

    canvas.addEventListener("mousemove", (e) => {
      if (spraying) {
        spray(e.clientX, e.clientY);
      }
    });

  }, []);

  return (
    <div style={{ background: "#0a0a0a" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

export default App;
