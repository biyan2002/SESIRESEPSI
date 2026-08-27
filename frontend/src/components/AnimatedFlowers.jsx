import React from "react";
import { motion } from "framer-motion";

const Petal = ({ size = 60, color = "#F9A8D4", stroke = "#E11D48" }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <g opacity="0.85">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="50"
          cy="30"
          rx="12"
          ry="22"
          fill={color}
          stroke={stroke}
          strokeWidth="0.6"
          transform={`rotate(${a} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="7" fill="#FBBF24" />
    </g>
  </svg>
);

const Leaf = ({ size = 50, color = "#F9A8D4" }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <path
      d="M50 10 C 20 30, 20 70, 50 90 C 80 70, 80 30, 50 10 Z"
      fill={color}
      opacity="0.75"
    />
    <path d="M50 10 L 50 90" stroke="#BE185D" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

const positions = [
  { top: "5%", left: "3%", size: 90, delay: 0, type: "petal", color: "#FBCFE8" },
  { top: "15%", right: "5%", size: 70, delay: 1.2, type: "petal", color: "#F9A8D4" },
  { top: "40%", left: "6%", size: 55, delay: 2.4, type: "leaf", color: "#FDE68A" },
  { bottom: "10%", right: "4%", size: 100, delay: 0.6, type: "petal", color: "#F9A8D4" },
  { bottom: "20%", left: "12%", size: 65, delay: 1.8, type: "petal", color: "#FBCFE8" },
  { top: "55%", right: "10%", size: 45, delay: 3.0, type: "leaf", color: "#FCA5A5" },
  { top: "70%", left: "40%", size: 40, delay: 2.0, type: "petal", color: "#F9A8D4" },
  { top: "8%", left: "45%", size: 50, delay: 1.5, type: "leaf", color: "#FBBF24" },
];

const AnimatedFlowers = ({ dense = false }) => {
  const items = dense ? [...positions, ...positions.slice(0, 4).map((p) => ({ ...p, top: p.bottom ? undefined : `${parseInt(p.top) + 30}%` }))] : positions;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {items.map((p, i) => (
        <motion.div
          key={i}
          className="absolute opacity-70"
          style={{ top: p.top, left: p.left, right: p.right, bottom: p.bottom }}
          initial={{ y: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: [0, -25, 0, -15, 0],
            rotate: [0, 10, -8, 12, 0],
            opacity: 0.7,
          }}
          transition={{
            duration: 8 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        >
          {p.type === "petal" ? (
            <Petal size={p.size} color={p.color} />
          ) : (
            <Leaf size={p.size} color={p.color} />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default AnimatedFlowers;
