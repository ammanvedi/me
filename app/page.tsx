'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Matter from 'matter-js';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';

interface TextBody {
  body: Matter.Body;
  char: string;
  fontSize: number;
  initialX: number;
  initialY: number;
  isTitle: boolean;
}

const blogPosts = [
  { title: "Robust Chat @ Scale", date: "2026-01-29", href: "/blog/robust-chat-at-scale" },
];

const MOVEMENT_THRESHOLD = 5;
const CANVAS_EXTENSION = 200; // How much canvas extends beyond container on each side

// Full description text - will be split dynamically based on width
const DESCRIPTION_TEXT = "I'm a product & software engineer interested in agentic systems, design systems. I studied comp sci @ UCL and work on everything front end @ CodeWords";

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

  const createLetterBodies = useCallback((containerWidth: number) => {
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

    // Canvas extends beyond container on each side
    const paddingOffset = CANVAS_EXTENSION;

    // Title lines
    const titleLines = [
      { text: 'AMMAN VEDI', fontSize: titleFontSize, y: 50 },
      { text: 'SOFTWARE ENGINEER', fontSize: titleFontSize, y: 50 + lineHeight },
    ];

    // Description lines - start after title with some gap
    const descStartY = 50 + lineHeight * 2 + 40; // gap after title

    titleLines.forEach(({ text, fontSize, y }) => {
      const charWidth = fontSize * 0.62;
      const startX = paddingOffset + charWidth / 2;

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
      const startX = paddingOffset + charWidth / 2;

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

  const createWalls = useCallback((width: number, height: number) => {
    const { Bodies, World } = Matter;
    const world = engineRef.current?.world;
    if (!world) return [];

    // Remove old walls
    wallsRef.current.forEach((wall) => {
      World.remove(world, wall);
    });

    const wallThickness = 100;
    const wallOptions = {
      isStatic: true,
      render: {
        fillStyle: 'transparent',
        strokeStyle: 'transparent',
      },
    };

    const walls = [
      Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, wallOptions),
      Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, wallOptions),
      Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, wallOptions),
      Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, wallOptions),
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

    const heroRect = heroRef.current.getBoundingClientRect();
    const containerWidth = heroRect.width;
    const height = heroRect.height;
    // Canvas is extended beyond container on both sides
    const canvasWidth = containerWidth + CANVAS_EXTENSION * 2;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: canvasWidth,
        height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio || 1,
      },
    });
    renderRef.current = render;

    createWalls(canvasWidth, height);
    createLetterBodies(containerWidth);

    const mouseBody = Bodies.circle(0, 0, 15, {
      isStatic: true,
      render: {
        fillStyle: 'transparent',
        strokeStyle: 'transparent',
      },
    });
    mouseBodyRef.current = mouseBody;
    World.add(engine.world, mouseBody);

    const handleMouseMove = (event: MouseEvent) => {
      if (mouseBodyRef.current && render.canvas) {
        const rect = render.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        Body.setPosition(mouseBodyRef.current, { x, y });
      }
    };

    render.canvas.addEventListener('mousemove', handleMouseMove);

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
      const heroRect = heroRef.current.getBoundingClientRect();
      const newContainerWidth = heroRect.width;
      const newHeight = heroRect.height;
      const newCanvasWidth = newContainerWidth + CANVAS_EXTENSION * 2;

      render.canvas.width = newCanvasWidth * (window.devicePixelRatio || 1);
      render.canvas.height = newHeight * (window.devicePixelRatio || 1);
      render.canvas.style.width = `${newCanvasWidth}px`;
      render.canvas.style.height = `${newHeight}px`;
      render.options.width = newCanvasWidth;
      render.options.height = newHeight;

      // Always update walls
      createWalls(newCanvasWidth, newHeight);

      if (!hasBeenTouchedRef.current) {
        // Text hasn't been touched - recreate at new positions
        createLetterBodies(newContainerWidth);
      }
      // If text has been touched, keep it where it is (walls will contain it)
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      render.canvas.removeEventListener('mousemove', handleMouseMove);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
    };
  }, [createLetterBodies, createWalls, checkForMovement]);

  return (
    <main className="min-h-screen bg-[#FAF6F0]">
      <div className="max-w-2xl mx-auto px-6">
        {/* Hero + Description Section */}
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
          
          {/* Matter.js canvas overlays this area - extends beyond padding for full interaction */}
          <div ref={sceneRef} className="absolute inset-y-0 -left-[200px] -right-[200px]" />
        </div>

        {/* Blog Posts Section */}
        <motion.section 
          className="py-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
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
