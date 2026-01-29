'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Matter from 'matter-js';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface TextBody {
  body: Matter.Body;
  char: string;
  fontSize: number;
  initialX: number;
  initialY: number;
  isTitle: boolean;
}

const blogPosts = [
  { title: "Robust Chat @ Scale", date: "2026-01-29", href: "https://codewords.ai/blog/building-robust-chat-at-scale" },
];

const MOVEMENT_THRESHOLD = 5;

// Full description text - will be split dynamically based on width
const DESCRIPTION_TEXT = "Hey! I'm a product engineer based in London, interested in agentic systems, design systems and bringing people joy through software. I studied comp sci @ UCL and work on everything front end @ codewords";

// Calculate responsive font sizes and line breaks based on container width
function getResponsiveConfig(containerWidth: number) {
  const isMobile = containerWidth < 500;
  const isTablet = containerWidth < 768;
  
  const titleFontSize = isMobile ? 20 : isTablet ? 18 : 16;
  const descFontSize = isMobile ? 16 : isTablet ? 15 : 14;
  const lineHeight = isMobile ? 28 : isTablet ? 26 : 24;
  const descLineHeight = isMobile ? 24 : isTablet ? 23 : 22;
  
  // Calculate max chars per line based on container width and font size
  const charWidth = descFontSize * 0.62;
  const maxCharsPerLine = Math.floor(containerWidth / charWidth) - 2; // Leave some margin
  
  // Split description into lines that fit
  const words = DESCRIPTION_TEXT.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return {
    titleFontSize,
    descFontSize,
    lineHeight,
    descLineHeight,
    descriptionLines: lines,
  };
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const textBodiesRef = useRef<TextBody[]>([]);
  const mouseBodyRef = useRef<Matter.Body | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const hasBeenTouchedRef = useRef<boolean>(false);
  
  const [showResetButton, setShowResetButton] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribeStatus === 'loading') return;

    setSubscribeStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubscribeStatus('success');
        setEmail('');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.9 },
        });
      } else {
        setSubscribeStatus('error');
      }
    } catch {
      setSubscribeStatus('error');
    }
  };

  const createLetterBodies = useCallback((containerWidth: number, offsetX: number = 0, offsetY: number = 0) => {
    const { Bodies, World } = Matter;
    const world = engineRef.current?.world;
    if (!world) return;

    // Clear existing text bodies
    textBodiesRef.current.forEach(({ body }) => {
      World.remove(world, body);
    });
    textBodiesRef.current = [];

    // Get responsive configuration
    const config = getResponsiveConfig(containerWidth);
    const { titleFontSize, descFontSize, lineHeight, descLineHeight, descriptionLines } = config;

    // Title lines - positioned relative to hero section
    const titleLines = [
      { text: 'AMMAN VEDI', fontSize: titleFontSize, y: offsetY + 50 },
      { text: 'PRODUCT ENGINEER', fontSize: titleFontSize, y: offsetY + 50 + lineHeight },
    ];

    // Description lines - start after title with some gap
    const descStartY = offsetY + 50 + lineHeight * 2 + 40; // gap after title

    titleLines.forEach(({ text, fontSize, y }) => {
      const charWidth = fontSize * 0.62;
      const startX = offsetX + charWidth / 2;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ') continue;

        const x = startX + i * charWidth;
        const bodyWidth = charWidth * 0.9;
        const bodyHeight = fontSize * 1.1;

        const body = Bodies.rectangle(x, y, bodyWidth, bodyHeight, {
          restitution: 0.8,
          friction: 0.1,
          frictionAir: 0.03,
          density: 0.002,
          render: {
            fillStyle: 'transparent',
            strokeStyle: 'transparent',
          },
        });

        World.add(world, body);
        textBodiesRef.current.push({ body, char, fontSize, initialX: x, initialY: y, isTitle: true });
      }
    });

    // Description lines
    descriptionLines.forEach((text, lineIndex) => {
      const fontSize = descFontSize;
      const y = descStartY + lineIndex * descLineHeight;
      const charWidth = fontSize * 0.62;
      const startX = offsetX + charWidth / 2;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ') continue;

        const x = startX + i * charWidth;
        const bodyWidth = charWidth * 0.9;
        const bodyHeight = fontSize * 1.1;

        const body = Bodies.rectangle(x, y, bodyWidth, bodyHeight, {
          restitution: 0.8,
          friction: 0.1,
          frictionAir: 0.03,
          density: 0.002,
          render: {
            fillStyle: 'transparent',
            strokeStyle: 'transparent',
          },
        });

        World.add(world, body);
        textBodiesRef.current.push({ body, char, fontSize, initialX: x, initialY: y, isTitle: false });
      }
    });
  }, []);

  const createWalls = useCallback((width: number) => {
    const { Bodies, World } = Matter;
    const world = engineRef.current?.world;
    if (!world) return [];

    // Remove old walls
    wallsRef.current.forEach((wall) => {
      World.remove(world, wall);
    });

    const wallThickness = 100;
    // Extend walls far beyond viewport so interaction works from anywhere on screen
    const extendedHeight = 2000; // Large enough to cover full page scroll
    const wallOptions = {
      isStatic: true,
      render: {
        fillStyle: 'transparent',
        strokeStyle: 'transparent',
      },
    };

    const walls = [
      // Floor - far below viewport
      Bodies.rectangle(width / 2, extendedHeight + wallThickness / 2, width * 2, wallThickness, wallOptions),
      // Ceiling - stays at top
      Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, wallOptions),
      // Left wall - extended height
      Bodies.rectangle(-wallThickness / 2, extendedHeight / 2, wallThickness, extendedHeight * 2, wallOptions),
      // Right wall - extended height
      Bodies.rectangle(width + wallThickness / 2, extendedHeight / 2, wallThickness, extendedHeight * 2, wallOptions),
    ];

    World.add(world, walls);
    wallsRef.current = walls;
    return walls;
  }, []);

  const resetText = useCallback(() => {
    const { Body } = Matter;
    
    textBodiesRef.current.forEach(({ body, initialX, initialY }) => {
      Body.setPosition(body, { x: initialX, y: initialY });
      Body.setAngle(body, 0);
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
    });
    
    hasBeenTouchedRef.current = false;
    setShowResetButton(false);
  }, []);

  const checkForMovement = useCallback(() => {
    let hasMoved = false;
    
    for (const { body, initialX, initialY } of textBodiesRef.current) {
      const dx = Math.abs(body.position.x - initialX);
      const dy = Math.abs(body.position.y - initialY);
      const angle = Math.abs(body.angle);
      
      if (dx > MOVEMENT_THRESHOLD || dy > MOVEMENT_THRESHOLD || angle > 0.1) {
        hasMoved = true;
        break;
      }
    }
    
    if (hasMoved) {
      hasBeenTouchedRef.current = true;
      if (!showResetButton) {
        setShowResetButton(true);
      }
    }
  }, [showResetButton]);

  useEffect(() => {
    if (!sceneRef.current || !heroRef.current) return;

    const { Engine, Render, Runner, World, Bodies, Events, Body } = Matter;

    const engine = Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
    });
    engineRef.current = engine;

    // Use full viewport for canvas
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: canvasWidth,
        height: canvasHeight,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio || 1,
      },
    });
    renderRef.current = render;

    // Get hero position for letter placement
    const heroRect = heroRef.current.getBoundingClientRect();

    createWalls(canvasWidth);
    createLetterBodies(heroRect.width, heroRect.left, heroRect.top);

    const mouseBody = Bodies.circle(0, 0, 15, {
      isStatic: true,
      render: {
        fillStyle: 'transparent',
        strokeStyle: 'transparent',
      },
    });
    mouseBodyRef.current = mouseBody;
    World.add(engine.world, mouseBody);

    // Listen on document so interaction works from anywhere on screen
    const handleMouseMove = (event: MouseEvent) => {
      if (mouseBodyRef.current && render.canvas) {
        const rect = render.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        Body.setPosition(mouseBodyRef.current, { x, y });
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (mouseBodyRef.current && render.canvas && event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = render.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        Body.setPosition(mouseBodyRef.current, { x, y });
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      // Same as touch move - position the pusher at touch point
      handleTouchMove(event);
    };

    // Add listeners to document for full-screen interaction
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });

    Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      
      textBodiesRef.current.forEach(({ body, char, fontSize, isTitle }) => {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        
        const fontWeight = isTitle ? '600' : '400';
        ctx.font = `${fontWeight} ${fontSize}px "JetBrains Mono", "SF Mono", "Fira Code", monospace`;
        ctx.fillStyle = '#1E3A8A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 0, 0);
        
        ctx.restore();
      });
      
      // Check for movement on each render
      checkForMovement();
    });

    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);
    Render.run(render);

    const handleResize = () => {
      if (!heroRef.current) return;
      
      const newCanvasWidth = window.innerWidth;
      const newCanvasHeight = window.innerHeight;
      const heroRect = heroRef.current.getBoundingClientRect();

      render.canvas.width = newCanvasWidth * (window.devicePixelRatio || 1);
      render.canvas.height = newCanvasHeight * (window.devicePixelRatio || 1);
      render.canvas.style.width = `${newCanvasWidth}px`;
      render.canvas.style.height = `${newCanvasHeight}px`;
      render.options.width = newCanvasWidth;
      render.options.height = newCanvasHeight;

      // Always update walls
      createWalls(newCanvasWidth);

      if (!hasBeenTouchedRef.current) {
        // Text hasn't been touched - recreate at new positions
        createLetterBodies(heroRect.width, heroRect.left, heroRect.top);
      }
      // If text has been touched, keep it where it is (walls will contain it)
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchstart', handleTouchStart);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
    };
  }, [createLetterBodies, createWalls, checkForMovement]);

  return (
    <main className="min-h-dvh bg-[#FAF6F0] flex flex-col">
      {/* Full-screen physics canvas layer */}
      <div 
        ref={sceneRef} 
        className="fixed inset-0 pointer-events-none z-10"
        style={{ pointerEvents: 'none' }}
      />
      
      <div className="max-w-2xl mx-auto px-6 relative flex-1 flex flex-col w-full">
        {/* Main content - vertically centered */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Hero + Description Section - invisible placeholder for layout */}
          <div ref={heroRef} className="relative w-full h-[320px] sm:h-[280px] md:h-[240px]">
            {/* Shadow text - reserves space, invisible */}
            <div className="invisible flex flex-col items-start justify-start pt-[50px] h-full font-mono">
              <span className="text-[20px] sm:text-[18px] md:text-[16px] leading-[28px] sm:leading-[26px] md:leading-[24px] font-semibold">AMMAN VEDI</span>
              <span className="text-[20px] sm:text-[18px] md:text-[16px] leading-[28px] sm:leading-[26px] md:leading-[24px] font-semibold">SOFTWARE ENGINEER</span>
              <div className="mt-10 text-[16px] sm:text-[15px] md:text-[14px] leading-[24px] sm:leading-[23px] md:leading-[22px]">
                {/* Placeholder lines - actual content rendered by Matter.js */}
                <span className="block">Line placeholder</span>
                <span className="block">Line placeholder</span>
                <span className="block">Line placeholder</span>
                <span className="block">Line placeholder</span>
                <span className="block">Line placeholder</span>
                <span className="block">Line placeholder</span>
              </div>
            </div>
          </div>

          {/* Blog Posts Section */}
          <motion.section 
            className="pt-2 pb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h3 className="font-mono text-[12px] text-[#1E3A8A]/50 mb-4">natterings</h3>
            <div className="space-y-6">
              {blogPosts.map((post, index) => (
                <motion.article 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                >
                  <Link href={post.href} className="group block">
                    <h2 className="font-mono text-[14px] font-medium text-[#1E3A8A] group-hover:underline">
                      {post.title}
                    </h2>
                    <time className="font-mono text-[12px] text-[#1E3A8A]/60">
                      {post.date}
                    </time>
                  </Link>
                </motion.article>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Email Subscription */}
        <motion.section
          className="py-8 border-t border-[#1E3A8A]/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          {subscribeStatus === 'success' ? (
            <p className="font-mono text-[16px] md:text-[14px] text-[#1E3A8A]">did we just become best friends?</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={subscribeStatus === 'loading'}
                className="flex-1 font-mono text-[16px] text-[#1E3A8A] bg-transparent border-b border-[#1E3A8A]/30 py-2 px-0 placeholder:text-[#1E3A8A]/40 focus:outline-none focus:border-[#1E3A8A] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={subscribeStatus === 'loading'}
                className="font-mono text-[16px] md:text-[14px] text-[#1E3A8A] hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {subscribeStatus === 'loading' ? '...' : 'subscribe'}
              </button>
            </form>
          )}
          {subscribeStatus === 'error' && (
            <p className="font-mono text-[14px] md:text-[12px] text-red-600 mt-2">something went wrong, try again</p>
          )}
        </motion.section>
      </div>

      {/* Reset Button */}
      <AnimatePresence>
        {showResetButton && (
          <motion.div
            className="fixed bottom-8 left-0 right-0 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={resetText}
              className="font-mono text-[14px] text-[#1E3A8A] bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-[#1E3A8A]/20 hover:bg-white hover:border-[#1E3A8A]/40 transition-colors shadow-lg"
            >
              oops i made a mess
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
