import React, { useEffect, useRef } from 'react';

export const GalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    let camX = width / 2;
    let camY = height / 2;
    let camScale = 1;

    const setCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      if (Math.abs(camX - width/2) < 50) {
        camX = width / 2;
        camY = height / 2;
      }
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Load actual high-resolution NASA/Wikimedia planet textures
    const images: Record<string, HTMLImageElement> = {};
    const imageUrls = {
      Sun: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/600px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg",
      Mercury: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercury_in_true_color.jpg/320px-Mercury_in_true_color.jpg",
      Venus: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/PIA23791-Venus-RealAndEnhancedContrastViews-20200608_%28cropped2%29.jpg/320px-PIA23791-Venus-RealAndEnhancedContrastViews-20200608_%28cropped2%29.jpg",
      Earth: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/320px-The_Earth_seen_from_Apollo_17.jpg",
      Mars: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/320px-OSIRIS_Mars_true_color.jpg",
      Jupiter: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/320px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg",
      Saturn: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/320px-Saturn_during_Equinox.jpg", 
      Uranus: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/320px-Uranus2.jpg",
      Neptune: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/320px-Neptune_Full.jpg",
      Pluto: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Pluto_in_True_Color_-_High-Res.jpg/320px-Pluto_in_True_Color_-_High-Res.jpg"
    };

    Object.keys(imageUrls).forEach(key => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrls[key as keyof typeof imageUrls];
      images[key] = img;
    });

    // Reduced number of stars for a cleaner look, added parallax depth
    const numStars = 450;
    const stars: { x: number; y: number; radius: number; color: string; speed: number; alpha: number; dAlpha: number; z: number }[] = [];
    const colors = ['#ffffff', '#ffe9c4', '#d4fbff', '#f4d1ff', '#e0f2fe'];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: (Math.random() * 0.08) + 0.02,
        alpha: Math.random(),
        dAlpha: (Math.random() * 0.005) - 0.0025,
        z: (Math.random() * 5) + 1 // Depth for parallax (1 = close, 6 = far)
      });
    }

    // Mathematical definition of the 9 celestial bodies
    const planets = [
      { name: 'Mercury', r: 4, dist: 100, speed: 0.00004, color: '#8c8c8c' },
      { name: 'Venus', r: 8, dist: 150, speed: 0.00003, color: '#e3bb76' },
      { name: 'Earth', r: 9, dist: 210, speed: 0.000025, color: '#2b82c9', hasMoon: true },
      { name: 'Mars', r: 6, dist: 270, speed: 0.00002, color: '#c1440e' },
      { name: 'Jupiter', r: 24, dist: 380, speed: 0.00001, color: '#c88b3a' },
      { name: 'Saturn', r: 20, dist: 490, speed: 0.000008, color: '#e3e0c0', hasRings: true },
      { name: 'Uranus', r: 14, dist: 590, speed: 0.000006, color: '#4b70dd' },
      { name: 'Neptune', r: 14, dist: 680, speed: 0.000005, color: '#274687' },
      { name: 'Pluto', r: 3, dist: 750, speed: 0.000004, color: '#cbd5e1' }
    ];

    let currentTarget = -1; // -1: Solar System Center, 0-8: Planets, 9: Deep Space
    let lastSwitchTime = Date.now();
    const switchInterval = 18000; // Shift focus every 18 seconds

    const render = () => {
      ctx.fillStyle = '#010205'; 
      ctx.fillRect(0, 0, width, height);

      const time = Date.now();
      const cx = width / 2;
      const cy = height / 2;
      const baseScale = width < 768 ? 0.6 : 1;

      // Handle Camera State Machine
      if (time - lastSwitchTime > switchInterval) {
        lastSwitchTime = time;
        // Randomly pick a new target:
        // 40% chance for Top View (-1), 40% chance for a planet (0-8), 20% chance Deep Space (9)
        const rand = Math.random();
        if (rand < 0.4) {
          currentTarget = -1;
        } else if (rand < 0.8) {
          currentTarget = Math.floor(Math.random() * planets.length);
        } else {
          currentTarget = 9;
        }
      }

      // Calculate Target Camera Values
      let tX = cx;
      let tY = cy;
      let tScale = baseScale;

      if (currentTarget === -1) {
        // Full Top View of Solar System
        tX = cx;
        tY = cy;
        tScale = baseScale * 0.9;
      } else if (currentTarget === 9) {
        // Deep Space Drift (Looking somewhere far out)
        tX = cx + Math.sin(time * 0.00005) * 800;
        tY = cy + Math.cos(time * 0.00005) * 800;
        tScale = baseScale * 1.5;
      } else {
        // Focusing on a specific planet
        const p = planets[currentTarget];
        const pDist = p.dist * baseScale;
        const angle = time * p.speed + (currentTarget * 45); 
        tX = cx + Math.cos(angle) * pDist;
        tY = cy + Math.sin(angle) * pDist;
        tScale = baseScale * 4.5; // Zoom in close!
      }

      // Smooth camera interpolation (lerp)
      camX += (tX - camX) * 0.012;
      camY += (tY - camY) * 0.012;
      camScale += (tScale - camScale) * 0.012;

      // Deep space galactic clouds (Static relative to screen for ambient feel)
      const t = time * 0.00002; 
      const g1 = ctx.createRadialGradient(
        cx + Math.sin(t) * 100, cy + Math.cos(t) * 100, 0, 
        cx, cy, width * 0.8
      );
      g1.addColorStop(0, 'rgba(20, 18, 50, 0.3)'); 
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      // Drifting Stars with Parallax based on camera movement
      stars.forEach(star => {
        star.x -= star.speed;
        star.y -= star.speed * 0.5; // Drift diagonally
        
        star.alpha += star.dAlpha;
        if (star.alpha <= 0.1 || star.alpha >= 1) star.dAlpha *= -1;

        // Calculate parallax position (smaller z means moves more with camera)
        const prxX = star.x + (cx - camX) / star.z;
        const prxY = star.y + (cy - camY) / star.z;
        
        // Wrap around seamlessly
        const wrappedX = ((prxX % width) + width) % width;
        const wrappedY = ((prxY % height) + height) % height;

        ctx.beginPath();
        ctx.arc(wrappedX, wrappedY, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, star.alpha));
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // --- BEGIN WORLD SPACE (Planets & Sun) ---
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(camScale, camScale);
      ctx.translate(-camX, -camY);

      // Draw Sun (Realistic rotating image + glow)
      const sunR = 60 * baseScale;
      ctx.shadowBlur = 60;
      ctx.shadowColor = '#f59e0b';
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
      ctx.clip();
      if (images.Sun && images.Sun.complete && images.Sun.naturalWidth > 0) {
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.00005);
        ctx.drawImage(images.Sun, -sunR, -sunR, sunR * 2, sunR * 2);
      } else {
        ctx.fillStyle = '#fef08a';
        ctx.fill();
      }
      ctx.restore();
      ctx.shadowBlur = 0;

      // Extra solar glow seamlessly fading into space
      const sunGlow = ctx.createRadialGradient(cx, cy, sunR * 0.9, cx, cy, sunR * 2.5);
      sunGlow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      sunGlow.addColorStop(0.2, 'rgba(253, 224, 71, 0.15)');
      sunGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.1)');
      sunGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, sunR * 2.5, 0, Math.PI*2);
      ctx.fill();

      // Draw Planets with High-Res NASA Images and 3D Shading
      planets.forEach((p, index) => {
        const pR = p.r * baseScale;
        const pDist = p.dist * baseScale;

        // Orbit path line (faint)
        ctx.beginPath();
        ctx.arc(cx, cy, pDist, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Calculate exact planet position
        const angle = time * p.speed + (index * 45); 
        const px = cx + Math.cos(angle) * pDist;
        const py = cy + Math.sin(angle) * pDist;

        // Draw Saturn Rings accurately
        if (p.hasRings) {
          ctx.beginPath();
          ctx.ellipse(px, py, pR * 2.4, pR * 0.6, angle + Math.PI/4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(230, 210, 160, 0.35)';
          ctx.lineWidth = 3 * baseScale;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.ellipse(px, py, pR * 2.8, pR * 0.8, angle + Math.PI/4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(230, 210, 160, 0.15)';
          ctx.lineWidth = 1 * baseScale;
          ctx.stroke();
        }

        // Draw real planet texture masked into a perfect sphere
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, pR, 0, Math.PI * 2);
        ctx.clip();
        
        const img = images[p.name];
        if (img && img.complete && img.naturalWidth > 0) {
            // Apply slow axial rotation to planet bodies
            ctx.translate(px, py);
            ctx.rotate(time * 0.0002);
            ctx.drawImage(img, -pR, -pR, pR * 2, pR * 2);
            ctx.rotate(-time * 0.0002);
            ctx.translate(-px, -py);
        } else {
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        
        // Photorealistic 3D Shadow Overlay (Dark side facing away from the Sun)
        const dx = cx - px;
        const dy = cy - py;
        const distToSun = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / distToSun; 
        const ny = dy / distToSun;
        
        // Calculate offset so the light perfectly hits the side facing the Sun
        const hx = px + nx * (pR * 0.3);
        const hy = py + ny * (pR * 0.3);

        const pGrad = ctx.createRadialGradient(hx, hy, 0, px, py, pR);
        pGrad.addColorStop(0, 'rgba(0,0,0,0)'); 
        pGrad.addColorStop(0.5, 'rgba(0,0,0,0.1)'); 
        pGrad.addColorStop(0.85, 'rgba(0,0,0,0.7)'); 
        pGrad.addColorStop(1, 'rgba(0,0,0,0.95)'); 
        
        ctx.fillStyle = pGrad;
        ctx.fillRect(px - pR, py - pR, pR * 2, pR * 2);
        ctx.restore();

        // Earth's tiny Moon orbiting it
        if (p.hasMoon) {
          const mAngle = time * 0.002; 
          const mDist = pR * 2.5;
          const mx = px + Math.cos(mAngle) * mDist; 
          const my = py + Math.sin(mAngle) * mDist;
          ctx.beginPath();
          ctx.arc(mx, my, Math.max(1, pR * 0.25), 0, Math.PI * 2);
          ctx.fillStyle = '#e8e8e1';
          ctx.fill();
        }
      });
      
      ctx.restore(); // --- END WORLD SPACE ---

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#010205]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
