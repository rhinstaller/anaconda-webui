/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button, ButtonVariant } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Modal, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

import "./AnacondaSnake.scss";

const BOARD_WIDTH = 20;
const BOARD_HEIGHT = 15;
const INITIAL_SNAKE = [
    { x: 10, y: 7 },
    { x: 9, y: 7 },
    { x: 8, y: 7 },
];
const INITIAL_DIRECTION = { x: 1, y: 0 };

const DIFFICULTY_SPEEDS = {
    easy: 220,
    medium: 150,
    hard: 90,
    insane: 60,
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateFood = (currentSnake, existingFoods = []) => {
    const freeCells = [];

    // Free cells
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
            const collidesSnake = currentSnake.some((segment) => segment.x === c && segment.y === r);
            const collidesFood = existingFoods.some((f) => f && f.x === c && f.y === r);

            if (!collidesSnake && !collidesFood) {
                freeCells.push({ x: c, y: r });
            }
        }
    }
    if (freeCells.length === 0) {
        return null;
    }

    // Random free cell
    const randomIndex = Math.floor(Math.random() * freeCells.length);
    return freeCells[randomIndex];
};

// game logic
const computeNextGameState = (directionRef, nextDirectionRef, currentGameState) => {
    directionRef.current = nextDirectionRef.current;

    const { snake, food, powerUpFood, activeEffects } = currentGameState;
    const head = snake[0];
    const currentEffects = { ...activeEffects };

    let newHeadX = head.x + directionRef.current.x;
    let newHeadY = head.y + directionRef.current.y;

    // walls collision or teleport
    if (currentEffects.wallPassTicks > 0) {
        if (newHeadX < 0) newHeadX = BOARD_WIDTH - 1;
        else if (newHeadX >= BOARD_WIDTH) newHeadX = 0;

        if (newHeadY < 0) newHeadY = BOARD_HEIGHT - 1;
        else if (newHeadY >= BOARD_HEIGHT) newHeadY = 0;
    } else if (
        newHeadX < 0 ||
        newHeadX >= BOARD_WIDTH ||
        newHeadY < 0 ||
        newHeadY >= BOARD_HEIGHT
    ) {
        return { isGameOver: true };
    }

    const newHead = { x: newHeadX, y: newHeadY };

    // collision with body
    if (currentEffects.ghostTicks === 0 && snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        return { isGameOver: true };
    }

    const newSnake = [newHead, ...snake];
    let currentPowerUp = powerUpFood;
    let hasEatenFood = false;
    let nextFood = food;

    // power-up collision
    if (currentPowerUp && newHead.x === currentPowerUp.x && newHead.y === currentPowerUp.y) {
        const randomDuration = getRandomInt(20, 45);
        hasEatenFood = true;
        if (currentPowerUp.type === "ghost") {
            currentEffects.ghostTicks = randomDuration;
            currentEffects.wallPassTicks = 0;
        } else if (currentPowerUp.type === "wallPass") {
            currentEffects.wallPassTicks = randomDuration;
            currentEffects.ghostTicks = 0;
        }
        currentPowerUp = null;
    
    // food collision
    } else if (food && newHead.x === food.x && newHead.y === food.y) {
        hasEatenFood = true;
        nextFood = generateFood(newSnake, currentPowerUp ? [currentPowerUp] : []);
    } else {
        newSnake.pop();
    }
    if (currentPowerUp) {
        if (currentPowerUp.remainingTicks <= 1) {
            currentPowerUp = null;
        } else {
            currentPowerUp = { ...currentPowerUp, remainingTicks: currentPowerUp.remainingTicks - 1 };
        }
    } else if (!currentPowerUp && Math.random() < 0.04) {
        const type = Math.random() < 0.5 ? "ghost" : "wallPass";
        const pFood = generateFood(newSnake, [nextFood]);
        if (pFood) {
            const randomDespawn = getRandomInt(30, 60);
            currentPowerUp = {
                ...pFood,
                type,
                remainingTicks: randomDespawn,
            };
        }
    }

    const updatedEffects = {
        ghostTicks: Math.max(0, currentEffects.ghostTicks - 1),
        wallPassTicks: Math.max(0, currentEffects.wallPassTicks - 1),
    };

    return {
        isGameOver: false,
        hasEatenFood,
        nextGameState: {
            snake: newSnake,
            food: nextFood,
            powerUpFood: currentPowerUp,
            activeEffects: updatedEffects,
        },
    };
};

const useSnakeRefs = (gameState) => {
    const direction = useRef(INITIAL_DIRECTION);
    const nextDirection = useRef(INITIAL_DIRECTION);
    const state = useRef(gameState);

    useEffect(() => {
        state.current = gameState;
    }, [gameState]);

    return React.useMemo(() => ({
        direction,
        nextDirection,
        state,
    }), []);
};

const useSnakeControls = (isOpen, isPaused, isGameOver, togglePause, refs) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            const dir = refs.direction.current;
            const key = e.key;

            if (key === " " || key === "Spacebar") {
                e.preventDefault();
                togglePause();
                return;
            }

            if (isPaused || isGameOver) return;

            switch (key) {
            case "ArrowUp":
            case "w":
            case "W":
                if (dir.y !== 1) refs.nextDirection.current = { x: 0, y: -1 };
                e.preventDefault();
                break;
            case "ArrowDown":
            case "s":
            case "S":
                if (dir.y !== -1) refs.nextDirection.current = { x: 0, y: 1 };
                e.preventDefault();
                break;
            case "ArrowLeft":
            case "a":
            case "A":
                if (dir.x !== 1) refs.nextDirection.current = { x: -1, y: 0 };
                e.preventDefault();
                break;
            case "ArrowRight":
            case "d":
            case "D":
                if (dir.x !== -1) refs.nextDirection.current = { x: 1, y: 0 };
                e.preventDefault();
                break;
            default:
                break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isPaused, isGameOver, togglePause, refs]);
};

const useSnakeGame = (isOpen, progressPercent) => {
    const [gameState, setGameState] = useState(() => ({
        snake: INITIAL_SNAKE,
        food: generateFood(INITIAL_SNAKE),
        powerUpFood: null,
        activeEffects: { ghostTicks: 0, wallPassTicks: 0 },
    }));

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [hasNotifiedFinish, setHasNotifiedFinish] = useState(false);
    const [difficulty, setDifficulty] = useState("medium");

    const refs = useSnakeRefs(gameState);

    useEffect(() => {
        if (isGameOver) {
            setHighScore((prev) => Math.max(prev, score));
        }
    }, [isGameOver, score]);

    const resetGame = useCallback(() => {
        refs.direction.current = INITIAL_DIRECTION;
        refs.nextDirection.current = INITIAL_DIRECTION;

        setGameState({
            snake: INITIAL_SNAKE,
            food: generateFood(INITIAL_SNAKE),
            powerUpFood: null,
            activeEffects: { ghostTicks: 0, wallPassTicks: 0 },
        });

        setScore(0);
        setIsGameOver(false);
        setIsPaused(false);
    }, [refs]);

    const togglePause = useCallback(() => {
        setIsPaused((prev) => !prev);
    }, []);

    useEffect(() => {
        if (progressPercent === 100 && !hasNotifiedFinish && isOpen) {
            setIsPaused(true);
            setHasNotifiedFinish(true);
        }
    }, [progressPercent, hasNotifiedFinish, isOpen]);

    useSnakeControls(isOpen, isPaused, isGameOver, togglePause, refs);

    // timer 
    useEffect(() => {
        if (!isOpen || isGameOver || isPaused) return;

        const tickRate = DIFFICULTY_SPEEDS[difficulty] || 150;

        const timer = setInterval(() => {
            const result = computeNextGameState(refs.direction, refs.nextDirection, refs.state.current);

            if (result.isGameOver) {
                setIsGameOver(true);
                return;
            }

            if (result.hasEatenFood) {
                setScore((prev) => prev + 1);
            }

            setGameState(result.nextGameState);
        }, tickRate);

        return () => clearInterval(timer);
    }, [isOpen, isGameOver, isPaused, difficulty, refs]);

    useEffect(() => {
        if (isOpen) {
            resetGame();
        }
    }, [isOpen, resetGame]);

    return {
        snake: gameState.snake,
        food: gameState.food,
        powerUpFood: gameState.powerUpFood,
        activeEffects: gameState.activeEffects,
        score,
        highScore,
        isGameOver,
        isPaused,
        hasNotifiedFinish,
        difficulty,
        setDifficulty,
        resetGame,
        togglePause,
    };
};

const HeaderInfo = ({ hasNotifiedFinish, progressPercent, score, highScore, difficulty, setDifficulty }) => (
    <Flex 
      justifyContent={{ default: "justifyContentCenter" }}
      direction={{ default: "column" }} 
      spaceItems={{ default: "spaceItemsXs" }} 
      className="pf-v6-u-mb-md"
    >
        <FlexItem>
            <Flex justifyContent={{ default: "justifyContentCenter" }} spaceItems={{ default: "spaceItemsXl" }}>
                <FlexItem><Content component="h3">{hasNotifiedFinish ? "Fedora is installed" : "Anaconda is installing Fedora while you are playing."}</Content></FlexItem>
                <FlexItem><Content component="h3">Installation: {progressPercent}%</Content></FlexItem>
            </Flex>
        </FlexItem>
        <FlexItem>
            <Flex justifyContent={{ default: "justifyContentCenter" }} spaceItems={{ default: "spaceItemsXl" }}>
                <FlexItem><Content component="h3">Score: {score}</Content></FlexItem>
                <FlexItem><Content component="h3">High score: {highScore}</Content></FlexItem>
            </Flex>
        </FlexItem>
        <FlexItem>
            <Flex justifyContent={{ default: "justifyContentCenter" }} spaceItems={{ default: "spaceItemsSm" }} className="pf-v6-u-mt-xs">
                <FlexItem>
                    <Button 
                      variant={difficulty === "easy" ? ButtonVariant.primary : ButtonVariant.control} 
                      onClick={() => setDifficulty("easy")}
                      size="sm"
                    >
                        Easy
                    </Button>
                </FlexItem>
                <FlexItem>
                    <Button 
                      variant={difficulty === "medium" ? ButtonVariant.primary : ButtonVariant.control} 
                      onClick={() => setDifficulty("medium")}
                      size="sm"
                    >
                        Medium
                    </Button>
                </FlexItem>
                <FlexItem>
                    <Button 
                      variant={difficulty === "hard" ? ButtonVariant.primary : ButtonVariant.control} 
                      onClick={() => setDifficulty("hard")}
                      size="sm"
                    >
                        Hard
                    </Button>
                </FlexItem>
                <FlexItem>
                    <Button 
                      variant={difficulty === "insane" ? ButtonVariant.primary : ButtonVariant.control} 
                      onClick={() => setDifficulty("insane")}
                      size="sm"
                    >
                        Insane
                    </Button>
                </FlexItem>
            </Flex>
        </FlexItem>
    </Flex>
);

const GameOverlay = ({ isGameOver, isPaused, progressPercent, resetGame, togglePause, onClose }) => {
    if (isGameOver) {
        return (
            <div className="game-over-overlay">
                <h2>GAME OVER</h2>
                <Button variant={ButtonVariant.primary} onClick={resetGame}>
                    Play Again
                </Button>
            </div>
        );
    }

    if (isPaused && progressPercent < 100) {
        return (
            <div className="game-over-overlay">
                <h2>PAUSED</h2>
                <Button variant={ButtonVariant.primary} onClick={togglePause}>
                    Resume
                </Button>
            </div>
        );
    }

    if (progressPercent === 100 && isPaused) {
        return (
            <div className="game-over-overlay">
                <h2>Fedora is installed</h2>
                <Flex justifyContent={{ default: "justifyContentCenter" }} spaceItems={{ default: "spaceItemsMd" }} className="pf-v6-u-mt-md">
                    <FlexItem>
                        <Button variant={ButtonVariant.primary} onClick={togglePause}>
                            Resume
                        </Button>
                    </FlexItem>
                    <FlexItem>
                        <Button variant={ButtonVariant.secondary} onClick={onClose}>
                            Close
                        </Button>
                    </FlexItem>
                </Flex>
            </div>
        );
    }

    return null;
};

const GameBoard = ({ snake, food, powerUpFood, activeEffects }) => {
    const snakeMap = new Map(
        snake.map((segment, index) => [`${segment.x}-${segment.y}`, index])
    );

    return (
        <div
          className="snake-board"
          style={{
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
              gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`,
          }}
        >
            {Array.from({ length: BOARD_HEIGHT }).map((_, r) =>
                Array.from({ length: BOARD_WIDTH }).map((_, c) => {
                    const cellKey = `${c}-${r}`;
                    const snakeIndex = snakeMap.get(cellKey) ?? -1;
                    const isFood = food && food.x === c && food.y === r;
                    const isPowerUp = powerUpFood && powerUpFood.x === c && powerUpFood.y === r;

                    let cellClass = "cell";
                    let customStyle = {};

                    if (snakeIndex === 0) {
                        cellClass += " snake-head";
                        const hue = Math.max(50, 200 - (snakeIndex * 150) / snake.length);
                        customStyle = { backgroundColor: `hsl(${hue}, 90%, 55%)` };
                    } else if (snakeIndex > 0) {
                        cellClass += " snake-body";
                        const hue = Math.max(50, 200 - (snakeIndex * 150) / snake.length);
                        const isEndingSoon = (activeEffects.wallPassTicks > 0 && activeEffects.wallPassTicks <= 5) || 
                                            (activeEffects.ghostTicks > 0 && activeEffects.ghostTicks <= 5);
                        const activeTicksLeft = activeEffects.wallPassTicks || activeEffects.ghostTicks;
                        const blinkOpacity = (isEndingSoon && activeTicksLeft % 2 === 1) ? 0.2 : 1;

                        customStyle = { 
                            backgroundColor: `hsl(${hue}, 90%, 55%)`,
                            opacity: blinkOpacity
                        };
                    } else if (isFood) {
                        cellClass += " food";
                    } else if (isPowerUp) {
                        // Všechny barvy, kulatost i stíny si vezme přímo z vašich SCSS tříd .food-ghost a .food-wallPass!
                        cellClass += ` food-powerup food-${powerUpFood.type}`;
                    }

                    return <div key={cellKey} className={cellClass} style={customStyle} />;
                })
            )}
        </div>
    );
};

const FooterControls = ({ togglePause, isGameOver, isPaused, powerUpFood, activeEffects }) => (
    <Flex 
      justifyContent={{ default: "justifyContentCenter" }}
      direction={{ default: "column" }} 
      spaceItems={{ default: "spaceItemsXs" }} 
      className="pf-v6-u-mb-md"
    >
        <FlexItem>
            <Flex justifyContent={{ default: "justifyContentCenter" }} spaceItems={{ default: "spaceItemsLg" }}>
                <FlexItem>
                    <Button variant={ButtonVariant.secondary} onClick={togglePause} isDisabled={isGameOver}>
                        {isPaused ? "Resume" : "Pause"}
                    </Button>
                </FlexItem>
            </Flex>
        </FlexItem>
        {(powerUpFood || activeEffects.ghostTicks > 1 || activeEffects.wallPassTicks > 1) && (
            <FlexItem>
                <Flex justifyContent={{ default: "justifyContentCenter" }} spaceItems={{ default: "spaceItemsMd" }}>
                    {activeEffects.ghostTicks > 1 && (
                        <FlexItem>
                            <Content component="small" style={{ color: "var(--pf-v6-global--palette--purple-400, #b388ff)", fontWeight: "bold" }}>
                                ACTIVE GHOST: {(activeEffects.ghostTicks)-1} ticks left
                            </Content>
                        </FlexItem>
                    )}
                    {activeEffects.wallPassTicks > 1 && (
                        <FlexItem>
                            <Content component="small" style={{ color: "var(--pf-v6-global--palette--teal-400, #00e5ff)", fontWeight: "bold" }}>
                                ACTIVE WALL PASS: {(activeEffects.wallPassTicks)-1} ticks left
                            </Content>
                        </FlexItem>
                    )}
                </Flex>
            </FlexItem>
        )}
        <FlexItem>
            <Flex justifyContent={{ default: "justifyContentCenter" }} spaceItems={{ default: "spaceItemsLg" }}>
                <FlexItem>
                    <Content component="small" style={{ color: "var(--pf-v6-global--palette--red-400, #c9190b)" }}>● Food (+1)</Content>
                </FlexItem>
                <FlexItem>
                    <Content component="small" style={{ color: "var(--pf-v6-global--palette--purple-400, #b388ff)" }}>● Ghost (Phase body)</Content>
                </FlexItem>
                <FlexItem>
                    <Content component="small" style={{ color: "var(--pf-v6-global--palette--teal-400, #00e5ff)" }}>● Wall Pass (Pass walls)</Content>
                </FlexItem>
            </Flex>
        </FlexItem>
    </Flex>
);

export const AnacondaSnakeModal = ({ isOpen, onClose, progressPercent = 0 }) => {
    const {
        snake,
        food,
        powerUpFood,
        activeEffects,
        score,
        highScore,
        isGameOver,
        isPaused,
        hasNotifiedFinish,
        difficulty,
        setDifficulty,
        resetGame,
        togglePause,
    } = useSnakeGame(isOpen, progressPercent);

    return (
        <Modal
          variant={ModalVariant.medium}
          title="Anaconda"
          isOpen={isOpen}
          onClose={onClose}
          actions={[
              <Button key="pause" variant={ButtonVariant.tertiary} onClick={togglePause} isDisabled={isGameOver}>
                  {isPaused ? "Resume" : "Pause"}
              </Button>,
              <Button key="restart" variant={ButtonVariant.secondary} onClick={resetGame}>Restart</Button>,
              <Button key="close" variant={ButtonVariant.primary} onClick={onClose}>Close</Button>,
          ]}
        >
            <HeaderInfo
              hasNotifiedFinish={hasNotifiedFinish}
              progressPercent={progressPercent}
              score={score}
              highScore={highScore}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
            />
            <div className="snake-board-container">
                <GameOverlay
                  isGameOver={isGameOver}
                  isPaused={isPaused}
                  progressPercent={progressPercent}
                  resetGame={resetGame}
                  togglePause={togglePause}
                  onClose={onClose}
                />
                <GameBoard
                  snake={snake}
                  food={food}
                  powerUpFood={powerUpFood}
                  activeEffects={activeEffects}
                />
            </div>
            <FooterControls
              togglePause={togglePause}
              isGameOver={isGameOver}
              isPaused={isPaused}
              powerUpFood={powerUpFood}
              activeEffects={activeEffects}
            />
        </Modal>
    );
};
