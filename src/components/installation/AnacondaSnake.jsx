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
const TICK_RATE = 150;

const generateFood = (currentSnake) => {
    let newFood;
    while (true) {
        newFood = {
            x: Math.floor(Math.random() * BOARD_WIDTH),
            y: Math.floor(Math.random() * BOARD_HEIGHT),
        };
        const collides = currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y);
        if (!collides) break;
    }
    return newFood;
};

export const AnacondaSnakeModal = ({ isOpen, onClose, progressPercent = 0 }) => {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(() => generateFood(INITIAL_SNAKE));
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);

    const directionRef = useRef(INITIAL_DIRECTION);
    const nextDirectionRef = useRef(INITIAL_DIRECTION);
    const snakeRef = useRef(INITIAL_SNAKE);
    const foodRef = useRef(food);

    useEffect(() => {
        snakeRef.current = snake;
    }, [snake]);

    useEffect(() => {
        foodRef.current = food;
    }, [food]);

    const resetGame = useCallback(() => {
        setSnake(INITIAL_SNAKE);
        directionRef.current = INITIAL_DIRECTION;
        nextDirectionRef.current = INITIAL_DIRECTION;

        const newFood = generateFood(INITIAL_SNAKE);
        setFood(newFood);

        setScore(0);
        setIsGameOver(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            const dir = directionRef.current;
            const key = e.key;

            switch (key) {
            case "ArrowUp":
            case "w":
            case "W":
                if (dir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
                e.preventDefault();
                break;
            case "ArrowDown":
            case "s":
            case "S":
                if (dir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
                e.preventDefault();
                break;
            case "ArrowLeft":
            case "a":
            case "A":
                if (dir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
                e.preventDefault();
                break;
            case "ArrowRight":
            case "d":
            case "D":
                if (dir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
                e.preventDefault();
                break;
            default:
                break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || isGameOver) return;

        const timer = setInterval(() => {
            directionRef.current = nextDirectionRef.current;
            const head = snakeRef.current[0];
            const newHead = {
                x: head.x + directionRef.current.x,
                y: head.y + directionRef.current.y,
            };

            if (
                newHead.x < 0 ||
                newHead.x >= BOARD_WIDTH ||
                newHead.y < 0 ||
                newHead.y >= BOARD_HEIGHT
            ) {
                setIsGameOver(true);
                return;
            }

            if (snakeRef.current.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
                setIsGameOver(true);
                return;
            }

            const newSnake = [newHead, ...snakeRef.current];

            if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
                setScore((prev) => prev + 1);
                const nextFood = generateFood(newSnake);
                setFood(nextFood);
            } else {
                newSnake.pop();
            }

            setSnake(newSnake);
        }, TICK_RATE);

        return () => clearInterval(timer);
    }, [isOpen, isGameOver]);

    useEffect(() => {
        if (isOpen) {
            resetGame();
        }
    }, [isOpen, resetGame]);

    return (
        <Modal
          variant={ModalVariant.medium}
          title="ANACONDA"
          isOpen={isOpen}
          onClose={onClose}
          actions={[
              <Button key="restart" variant={ButtonVariant.secondary} onClick={resetGame}>Restart</Button>,
              <Button key="close" variant={ButtonVariant.primary} onClick={onClose}>Close</Button>,
          ]}
        >
            <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} className="pf-u-mb-md">
                <FlexItem><Content component="h3">Anaconda is installing Fedora while you are playing.</Content></FlexItem>
                <FlexItem><Content component="h3">Installation: {progressPercent}%</Content></FlexItem>
                <FlexItem><Content component="h3">Score: {score}</Content></FlexItem>
            </Flex>

            <div className="snake-board-container">
                {isGameOver && (
                    <div className="game-over-overlay">
                        <h2>GAME OVER</h2>
                        <Button variant={ButtonVariant.primary} onClick={resetGame}>
                            Play Again
                        </Button>
                    </div>
                )}
                <div
                  className="snake-board"
                  style={{
                      gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                      gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`,
                  }}
                >
                    {Array.from({ length: BOARD_HEIGHT }).map((_, r) =>
                        Array.from({ length: BOARD_WIDTH }).map((_, c) => {
                            const isSnake = snake.some((s) => s.x === c && s.y === r);
                            const isHead = snake[0].x === c && snake[0].y === r;
                            const isFood = food.x === c && food.y === r;
                            let cellClass = "cell";
                            if (isHead) cellClass += " snake-head";
                            else if (isSnake) cellClass += " snake-body";
                            else if (isFood) cellClass += " food";
                            return <div key={`${r}-${c}`} className={cellClass} />;
                        })
                    )}
                </div>
            </div>
        </Modal>
    );
};
