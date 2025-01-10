import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Undo2, Redo2 } from 'lucide-react';
import Confetti from 'react-confetti'; // Import Confetti

const COLORS = {
  LB: { name: 'LIGHT_BLUE',  hex: '#87CEEB' },
  DB: { name: 'DARK_BLUE',   hex: '#0000CD' },
  LG: { name: 'LIGHT_GREEN', hex: '#90EE90' },
  DG: { name: 'DARK_GREEN',  hex: '#006400' },
  PK: { name: 'PINK',        hex: '#FFB6C1' },
  RD: { name: 'RED',         hex: '#FF0000' },
  OR: { name: 'ORANGE',      hex: '#FFA500' },
  PU: { name: 'PURPLE',      hex: '#800080' },
  GY: { name: 'GRAY',        hex: '#808080' }
};

const initialPuzzleState = {
  maxBalls: 4,
  tubes: [
    ['RD', 'PK', 'LG', 'PK'],
    ['LG', 'RD', 'PK', 'LG'],
    ['DB', 'DB', 'RD', 'RD'],
    ['DB', 'PK', 'LG', 'DB'],
    [],
    []
  ]
};

// Solver functions (copied from previous artifact)
function validatePuzzle(tubes, maxBalls) {
  const errors = [];
  const counts = {};
  
  tubes.forEach((tube, idx) => {
    if (tube.length > maxBalls) {
      errors.push(`Tube ${idx + 1} exceeds maximum capacity of ${maxBalls}`);
    }
    tube.forEach(ball => {
      counts[ball] = (counts[ball] || 0) + 1;
    });
  });
  
  Object.entries(counts).forEach(([color, count]) => {
    if (count !== maxBalls) {
      errors.push(`Color ${color} has ${count} balls (expected ${maxBalls})`);
    }
  });
  
  const validColors = Object.keys(COLORS);
  Object.keys(counts).forEach(color => {
    if (!validColors.includes(color)) {
      errors.push(`Invalid color code: ${color}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    ballCounts: counts
  };
}

function isTubeSorted(tube, maxBalls) {
  // Empty tubes are not considered "sorted" - we need them for moves
  if (tube.length === 0) return false;
  
  // A tube is only sorted if it has all balls of the same color
  if (tube.length === maxBalls) {
    const color = tube[0];
    return tube.every(ball => ball === color);
  }
  
  // Partially filled tubes are not sorted
  return false;
}

function isEmptyTubeMoveNecessary(tubes, fromTubeIdx, ball, maxBalls) {
  return !tubes.some((tube, idx) => 
    idx !== fromTubeIdx && 
    tube.length > 0 && 
    tube.length < maxBalls && 
    tube[0] === ball
  );
}

function getNextStates(tubes, maxBalls) {
  const nextStates = [];

  for (let i = 0; i < tubes.length; i++) {
    const fromTube = tubes[i];
    if (fromTube.length === 0 || isTubeSorted(fromTube, maxBalls)) continue;
    
    const topBall = fromTube[0];

    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      const toTube = tubes[j];

      if (toTube.length >= maxBalls || isTubeSorted(toTube, maxBalls)) continue;

      const isValidMove = toTube.length === 0 || toTube[0] === topBall;
      const isUsefulMove = toTube.length > 0 || isEmptyTubeMoveNecessary(tubes, i, topBall, maxBalls);

      if (isValidMove && isUsefulMove) {
        const newTubes = tubes.map(t => [...t]);
        newTubes[i] = [...fromTube.slice(1)];
        newTubes[j] = [topBall, ...toTube];

        const moveDesc = getDetailedMoveDescription(i, j, topBall, toTube);
        nextStates.push({ nextTubes: newTubes, moveDescription: moveDesc });
      }
    }
  }

  return nextStates;
}

function getDetailedMoveDescription(fromIdx, toIdx, ball, targetTube) {
  const colorName = COLORS[ball].name;
  const fromTubeLabel = `Tube ${fromIdx + 1}`;
  const toTubeLabel = `Tube ${toIdx + 1}`;
  
  if (targetTube.length === 0) {
    return `Move ${colorName} from ${fromTubeLabel} to empty ${toTubeLabel}`;
  } else {
    const topColor = COLORS[targetTube[0]].name;
    return `Move ${colorName} from ${fromTubeLabel} to ${toTubeLabel} (on top of ${topColor})`;
  }
}

function serializeTubes(tubes) {
  return tubes.map(tube => tube.join(',')).join('|');
}

function isSolved(tubes, maxBalls) {
  return tubes.every(tube => isTubeSorted(tube, maxBalls) || tube.length === 0);
}

function solvePuzzleBFS(initialTubes, maxBalls, maxMoves = 25000000, timeLimit = 600000) {
  const validation = validatePuzzle(initialTubes, maxBalls);
  if (!validation.valid) {
    return {
      solvable: false,
      moves: [],
      error: 'Invalid puzzle state:',
      validation,
      searchStats: null
    };
  }

  const startState = { tubes: initialTubes, path: [] };
  const queue = [startState];
  const visited = new Set([serializeTubes(initialTubes)]);
  let moveCount = 0;
  let maxQueueSize = 1;
  const startTime = Date.now();

  // Track search statistics
  const searchStats = {
    startTime: new Date().toISOString(),
    endTime: null,
    totalStatesExplored: 0,
    maxQueueSize: 1,
    searchDuration: 0,
    statesPerSecond: 0,
    queueSizeHistory: [],
    reason: null
  };

  while (queue.length > 0 && moveCount < maxMoves) {
    const currentTime = Date.now();
    if (currentTime - startTime > timeLimit) {
      searchStats.reason = 'Time limit exceeded';
      break;
    }

    const { tubes, path } = queue.shift();
    moveCount++;
    searchStats.totalStatesExplored++;

    // Update statistics every 10,000 moves
    if (moveCount % 10000 === 0) {
      const duration = (currentTime - startTime) / 1000;
      searchStats.statesPerSecond = Math.round(searchStats.totalStatesExplored / duration);
      searchStats.queueSizeHistory.push(queue.length);
      searchStats.searchDuration = duration;
      console.log(`Progress: ${moveCount} states explored, ${searchStats.statesPerSecond} states/sec, Queue: ${queue.length}`);
    }

    maxQueueSize = Math.max(maxQueueSize, queue.length);

    if (isSolved(tubes, maxBalls)) {
      const endTime = Date.now();
      searchStats.endTime = new Date().toISOString();
      searchStats.searchDuration = (endTime - startTime) / 1000;
      searchStats.maxQueueSize = maxQueueSize;
      searchStats.reason = 'Solution found';
      
      return { 
        solvable: true, 
        moves: path,
        moveCount,
        statesExplored: visited.size,
        searchStats
      };
    }

    const nextStates = getNextStates(tubes, maxBalls);
    for (const { nextTubes, moveDescription } of nextStates) {
      const serialized = serializeTubes(nextTubes);
      if (!visited.has(serialized)) {
        visited.add(serialized);
        queue.push({
          tubes: nextTubes,
          path: [...path, moveDescription]
        });
      }
    }
  }

  const endTime = Date.now();
  searchStats.endTime = new Date().toISOString();
  searchStats.searchDuration = (endTime - startTime) / 1000;
  searchStats.maxQueueSize = maxQueueSize;
  searchStats.reason = searchStats.reason || (moveCount >= maxMoves ? 'Exceeded maximum moves' : 'No solution found');

  return { 
    solvable: false, 
    moves: [],
    error: searchStats.reason,
    statesExplored: visited.size,
    searchStats
  };
}

const BallSortGame = () => {
  // Game state
  const [tubes, setTubes] = useState(initialPuzzleState.tubes);
  const [moveCount, setMoveCount] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [solving, setSolving] = useState(false);
  const [solution, setSolution] = useState(null);
  const [validation, setValidation] = useState(null);
  const [dragState, setDragState] = useState({
    dragging: false,
    sourceIndex: null,
    invalidMove: false
  });
  const [isComplete, setIsComplete] = useState(false); // Add isComplete state

  const tubeRefs = useRef([]);

  // Game logic functions
  const isValidMove = (fromTube, toTube) => {
    if (fromTube === toTube) return false;
    if (tubes[fromTube].length === 0) return false;
    if (tubes[toTube].length >= initialPuzzleState.maxBalls) return false;
    
    const ballToMove = tubes[fromTube][0];
    return tubes[toTube].length === 0 || tubes[toTube][0] === ballToMove;
  };

  const makeMove = (fromTube, toTube) => {
    if (!isValidMove(fromTube, toTube)) {
      setDragState(prev => ({ ...prev, invalidMove: true }));
      setTimeout(() => setDragState(prev => ({ ...prev, invalidMove: false })), 500);
      return false;
    }

    const newTubes = [...tubes];
    const ball = newTubes[fromTube][0];
    newTubes[fromTube] = newTubes[fromTube].slice(1);
    newTubes[toTube] = [ball, ...newTubes[toTube]];
    
    setTubes(newTubes);
    setMoveCount(prev => prev + 1);
    setMoveHistory(prev => [...prev, { from: fromTube, to: toTube, ball }]);
    setRedoStack([]);
    
    if (isSolved(newTubes, initialPuzzleState.maxBalls)) { // Check if solved
      setIsComplete(true); // Set isComplete to true
    } else {
      setIsComplete(false); // Ensure isComplete is false if not solved
    }

    return true;
  };

  const undo = () => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const newTubes = [...tubes];
    const ball = newTubes[lastMove.to][0];
    newTubes[lastMove.to] = newTubes[lastMove.to].slice(1);
    newTubes[lastMove.from] = [ball, ...newTubes[lastMove.from]];
    
    setTubes(newTubes);
    setMoveCount(prev => prev - 1);
    setMoveHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastMove]);

    // Update isComplete based on the new state
    if (isSolved(newTubes, initialPuzzleState.maxBalls)) {
      setIsComplete(true);
    } else {
      setIsComplete(false);
    }
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const move = redoStack[redoStack.length - 1];
    makeMove(move.from, move.to);
    setRedoStack(prev => prev.slice(0, -1));
  };

  // 1. Add the startNewGame function
  const startNewGame = () => {
    setTubes(initialPuzzleState.tubes);
    setMoveCount(0);
    setMoveHistory([]);
    setRedoStack([]);
    setIsComplete(false);
    setValidation(null);
    setSolution(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e, tubeIndex) => {
    if (tubes[tubeIndex].length === 0) {
      e.preventDefault();
      return;
    }
    setDragState({
      dragging: true,
      sourceIndex: tubeIndex,
      invalidMove: false
    });
  };

  const handleDragOver = (e, tubeIndex) => {
    e.preventDefault();
    if (dragState.sourceIndex !== null && isValidMove(dragState.sourceIndex, tubeIndex)) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDrop = (e, tubeIndex) => {
    e.preventDefault();
    if (dragState.sourceIndex !== null) {
      makeMove(dragState.sourceIndex, tubeIndex);
    }
    setDragState({ dragging: false, sourceIndex: null, invalidMove: false });
  };

  const handleDragEnd = () => {
    setDragState({ dragging: false, sourceIndex: null, invalidMove: false });
  };

  // Solver integration
  const handleSolve = async () => {
    setSolving(true);
    setSolution(null);
    
    // Validate first
    const validationResult = validatePuzzle(tubes, initialPuzzleState.maxBalls);
    setValidation(validationResult);
    
    if (!validationResult.valid) {
      setSolving(false);
      return;
    }

    setTimeout(() => {
      const result = solvePuzzleBFS(
        tubes.map(t => [...t]), 
        initialPuzzleState.maxBalls
      );
      setSolution(result);
      setSolving(false);
    }, 100);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Ball Sort Puzzle</span>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-normal">Moves: {moveCount}</span>
            <Button variant="outline" size="sm" onClick={undo} disabled={moveHistory.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={redoStack.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="primary" size="sm" onClick={startNewGame} className="ml-2">
              New Game
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSolve} disabled={solving}>
              {solving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Solving...
                </>
              ) : 'Solve Puzzle'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Game grid */}
          <div className="grid grid-cols-6 gap-4 justify-center">
            {tubes.map((tube, tubeIndex) => (
              <div 
                key={tubeIndex} 
                className="flex flex-col items-center"
                ref={el => tubeRefs.current[tubeIndex] = el}
              >
                <div 
                  className={`flex flex-col space-y-1 border rounded p-2 ${
                    dragState.dragging && isValidMove(dragState.sourceIndex, tubeIndex) 
                      ? 'border-green-500' 
                      : ''
                  } ${
                    dragState.invalidMove && dragState.sourceIndex === tubeIndex 
                      ? 'shake' 
                      : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, tubeIndex)}
                  onDrop={(e) => handleDrop(e, tubeIndex)}
                >
                  {Array(initialPuzzleState.maxBalls - tube.length)
                    .fill(null)
                    .map((_, i) => (
                      <div key={`empty-${i}`} className="w-8 h-8 border rounded-full" />
                    ))}
                  {tube.map((ball, ballIndex) => (
                    <div
                      key={ballIndex}
                      className={`w-8 h-8 rounded-full ${
                        ballIndex === 0 ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                      style={{ backgroundColor: COLORS[ball].hex }}
                      draggable={ballIndex === 0}
                      onDragStart={(e) => handleDragStart(e, tubeIndex)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">Tube {tubeIndex + 1}</span>
              </div>
            ))}
          </div>

          {/* Completion Message */}
          {isComplete && (
            <div className="flex flex-col items-center mt-4">
              <p className="text-2xl">🎉 Congratulations! You've solved the puzzle! 🎉</p>
              <Confetti />
            </div>
          )}

          {/* Validation Results */}
          {validation && !validation.valid && (
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <h3 className="text-red-800 font-medium">Validation Errors</h3>
              </div>
              <ul className="mt-2 text-red-700">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Solution Display */}
                        {solution && (
            <div className="mt-4 space-y-4">
              {solution.solvable ? (
                <>
                  <div className="flex items-center text-green-700 bg-green-50 p-4 rounded-md">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <span>Solution found in {solution.moves.length} moves!</span>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">Search Statistics:</h3>
                    <ul className="space-y-1">
                      <li>Search duration: {solution.searchStats.searchDuration.toFixed(2)} seconds</li>
                      <li>States explored: {solution.searchStats.totalStatesExplored.toLocaleString()}</li>
                      <li>States per second: {solution.searchStats.statesPerSecond.toLocaleString()}</li>
                      <li>Maximum queue size: {solution.searchStats.maxQueueSize.toLocaleString()}</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    {solution.moves.map((move, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">Move {idx + 1}:</span> {move}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center text-red-700 bg-red-50 p-4 rounded-md">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{solution.error}</span>
                  </div>
                  {solution.searchStats && (
                    <div className="bg-blue-50 p-4 rounded-md space-y-2">
                      <h3 className="font-medium">Search Statistics:</h3>
                      <ul className="space-y-1">
                        <li>Search duration: {solution.searchStats.searchDuration.toFixed(2)} seconds</li>
                        <li>States explored: {solution.searchStats.totalStatesExplored.toLocaleString()}</li>
                        <li>States per second: {solution.searchStats.statesPerSecond.toLocaleString()}</li>
                        <li>Maximum queue size: {solution.searchStats.maxQueueSize.toLocaleString()}</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </Card>
  );
};

export default BallSortGame;