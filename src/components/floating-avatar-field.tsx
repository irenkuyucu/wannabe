"use client";

import { useEffect, useMemo, useRef } from "react";

import { AvatarArt } from "@/components/avatar-art";
import type { AvatarOption } from "@/lib/avatar-options";
import { getAvatarOption } from "@/lib/avatar-options";
import type { PlayerDoc } from "@/lib/firebase-client";

type FloatingAvatarFieldProps = {
  heightClassName?: string;
  phaseKey: string;
  players: PlayerDoc[];
};

type FloatingAvatarSprite = {
  avatar: AvatarOption;
  playerId: string;
  seed: number;
};

type FloatingAvatarParticle = {
  el: HTMLDivElement;
  radius: number;
  speed: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

const INITIAL_PLACEMENT_ATTEMPTS = 40;
const MIN_AVATAR_GAP = 8;
const MIN_AVATAR_SPEED = 10;
const MAX_AVATAR_SPEED = 18;
const MAX_FRAME_DELTA_SECONDS = 1 / 30;
const OVERLAP_RESOLUTION_PASSES = 6;

function hashSeed(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number) {
  return (seed % 10000) / 10000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampParticleToBounds(
  particle: FloatingAvatarParticle,
  width: number,
  height: number,
) {
  const minX = particle.radius;
  const maxX = Math.max(width - particle.radius, minX);
  const minY = particle.radius;
  const maxY = Math.max(height - particle.radius, minY);

  particle.x = clamp(particle.x, minX, maxX);
  particle.y = clamp(particle.y, minY, maxY);
}

function clampParticleSpeed(particle: FloatingAvatarParticle, fallbackAngle: number) {
  const currentSpeed = Math.hypot(particle.vx, particle.vy);

  if (currentSpeed < 0.0001) {
    particle.vx = Math.cos(fallbackAngle) * MIN_AVATAR_SPEED;
    particle.vy = Math.sin(fallbackAngle) * MIN_AVATAR_SPEED;
    return;
  }

  const nextSpeed = clamp(currentSpeed, MIN_AVATAR_SPEED, MAX_AVATAR_SPEED);
  const speedRatio = nextSpeed / currentSpeed;
  particle.vx *= speedRatio;
  particle.vy *= speedRatio;
}

function findInitialPosition(
  seed: number,
  radius: number,
  width: number,
  height: number,
  particles: FloatingAvatarParticle[],
) {
  const availableWidth = Math.max(width - radius * 2, 0);
  const availableHeight = Math.max(height - radius * 2, 0);

  for (let attempt = 0; attempt < INITIAL_PLACEMENT_ATTEMPTS; attempt += 1) {
    const attemptSeed = (seed + Math.imul(attempt + 1, 2654435761)) >>> 0;
    const x = radius + seededUnit(attemptSeed) * availableWidth;
    const y = radius + seededUnit(attemptSeed >> 5) * availableHeight;
    const collides = particles.some((particle) => {
      const dx = particle.x - x;
      const dy = particle.y - y;
      const minDistance = particle.radius + radius + MIN_AVATAR_GAP;
      return dx * dx + dy * dy < minDistance * minDistance;
    });

    if (!collides) {
      return { x, y };
    }
  }

  return {
    x: radius + seededUnit(seed) * availableWidth,
    y: radius + seededUnit(seed >> 5) * availableHeight,
  };
}

function resolveParticleOverlap(
  first: FloatingAvatarParticle,
  second: FloatingAvatarParticle,
  width: number,
  height: number,
  fallbackSeed: number,
) {
  let dx = second.x - first.x;
  let dy = second.y - first.y;
  let distance = Math.hypot(dx, dy);

  if (distance < 0.0001) {
    const angle = seededUnit(fallbackSeed) * Math.PI * 2;
    dx = Math.cos(angle);
    dy = Math.sin(angle);
    distance = 1;
  }

  const normalX = dx / distance;
  const normalY = dy / distance;
  const minDistance = first.radius + second.radius + MIN_AVATAR_GAP;

  if (distance < minDistance) {
    const overlap = minDistance - distance;
    first.x -= normalX * (overlap / 2);
    first.y -= normalY * (overlap / 2);
    second.x += normalX * (overlap / 2);
    second.y += normalY * (overlap / 2);

    const relativeVelocityX = second.vx - first.vx;
    const relativeVelocityY = second.vy - first.vy;
    const relativeNormalVelocity =
      relativeVelocityX * normalX + relativeVelocityY * normalY;

    if (relativeNormalVelocity < 0) {
      const impulse = -relativeNormalVelocity * 0.92;
      first.vx -= normalX * impulse;
      first.vy -= normalY * impulse;
      second.vx += normalX * impulse;
      second.vy += normalY * impulse;
    }

    clampParticleToBounds(first, width, height);
    clampParticleToBounds(second, width, height);
    clampParticleSpeed(first, seededUnit(fallbackSeed >> 3) * Math.PI * 2);
    clampParticleSpeed(second, seededUnit(fallbackSeed >> 7) * Math.PI * 2);
  }
}

function renderParticles(particles: FloatingAvatarParticle[]) {
  for (const particle of particles) {
    particle.el.style.transform = `translate3d(${particle.x - particle.radius}px, ${particle.y - particle.radius}px, 0)`;
  }
}

function getFloatingAvatarSprites(
  players: PlayerDoc[],
  phaseKey: string,
): FloatingAvatarSprite[] {
  return players.map((player, index) => {
    const avatar = getAvatarOption(player.avatarId);
    return {
      avatar,
      playerId: player.playerId,
      seed: hashSeed(`${phaseKey}:${player.playerId}:${index}`),
    };
  });
}

export function FloatingAvatarField({
  heightClassName,
  phaseKey,
  players,
}: FloatingAvatarFieldProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const playersRef = useRef(players);
  const playerSignature = useMemo(
    () =>
      players
        .map((player) => `${player.playerId}:${player.avatarId ?? "default"}`)
        .join("|"),
    [players],
  );
  const renderSprites = getFloatingAvatarSprites(players, phaseKey);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sprites = getFloatingAvatarSprites(playersRef.current, phaseKey);

    if (!canvas || sprites.length === 0) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let particles: FloatingAvatarParticle[] = [];
    let frameId = 0;
    let lastTimestamp = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;

    const initializeParticles = () => {
      canvasWidth = canvas.clientWidth;
      canvasHeight = canvas.clientHeight;

      particles = [];

      for (const sprite of sprites) {
        const node = nodeRefs.current.get(sprite.playerId);
        if (!node) {
          continue;
        }

        const radius = node.offsetWidth / 2;
        const { x, y } = findInitialPosition(
          sprite.seed,
          radius,
          canvasWidth,
          canvasHeight,
          particles,
        );
        const angle = seededUnit(sprite.seed >> 9) * Math.PI * 2;
        const speed =
          MIN_AVATAR_SPEED +
          seededUnit(sprite.seed >> 13) * (MAX_AVATAR_SPEED - MIN_AVATAR_SPEED);

        particles.push({
          el: node,
          radius,
          speed,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          x,
          y,
        });
      }

      for (let pass = 0; pass < OVERLAP_RESOLUTION_PASSES; pass += 1) {
        for (let index = 0; index < particles.length; index += 1) {
          const particle = particles[index];
          clampParticleToBounds(particle, canvasWidth, canvasHeight);

          for (let peerIndex = index + 1; peerIndex < particles.length; peerIndex += 1) {
            resolveParticleOverlap(
              particle,
              particles[peerIndex],
              canvasWidth,
              canvasHeight,
              sprites[index]?.seed ?? sprites[peerIndex]?.seed ?? 0,
            );
          }
        }
      }

      renderParticles(particles);
      lastTimestamp = performance.now();
    };

    const step = (timestamp: number) => {
      const deltaSeconds = Math.min(
        (timestamp - lastTimestamp) / 1000,
        MAX_FRAME_DELTA_SECONDS,
      );
      lastTimestamp = timestamp;

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;

        if (particle.x <= particle.radius) {
          particle.x = particle.radius;
          particle.vx = Math.abs(particle.vx);
        } else if (particle.x >= canvasWidth - particle.radius) {
          particle.x = canvasWidth - particle.radius;
          particle.vx = -Math.abs(particle.vx);
        }

        if (particle.y <= particle.radius) {
          particle.y = particle.radius;
          particle.vy = Math.abs(particle.vy);
        } else if (particle.y >= canvasHeight - particle.radius) {
          particle.y = canvasHeight - particle.radius;
          particle.vy = -Math.abs(particle.vy);
        }

        clampParticleSpeed(
          particle,
          seededUnit(sprites[index]?.seed ?? 0) * Math.PI * 2,
        );
      }

      for (let index = 0; index < particles.length; index += 1) {
        for (let peerIndex = index + 1; peerIndex < particles.length; peerIndex += 1) {
          resolveParticleOverlap(
            particles[index],
            particles[peerIndex],
            canvasWidth,
            canvasHeight,
            sprites[index]?.seed ?? sprites[peerIndex]?.seed ?? 0,
          );
        }
      }

      renderParticles(particles);
      frameId = window.requestAnimationFrame(step);
    };

    initializeParticles();

    const resizeObserver = new ResizeObserver(() => {
      initializeParticles();
    });
    resizeObserver.observe(canvas);

    if (!prefersReducedMotion) {
      frameId = window.requestAnimationFrame(step);
    }

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [phaseKey, playerSignature]);

  return (
    <div
      aria-hidden="true"
      className={`floating-avatar-field ${heightClassName ?? ""}`.trim()}
    >
      <div className="floating-avatar-canvas" ref={canvasRef}>
        {renderSprites.map((sprite) => (
          <div
            className="floating-avatar-node"
            key={sprite.playerId}
            ref={(node) => {
              if (node) {
                nodeRefs.current.set(sprite.playerId, node);
              } else {
                nodeRefs.current.delete(sprite.playerId);
              }
            }}
          >
            <div className="floating-avatar-bob">
              <div className="avatar-frame avatar-md floating-avatar">
                <AvatarArt avatar={sprite.avatar} className="avatar-image" decorative />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
