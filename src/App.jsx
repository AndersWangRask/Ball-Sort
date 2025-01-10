import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Undo2, Redo2 } from 'lucide-react';

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
  ['OR', 'LG', 'PU', 'GY'],     // Tube 1
  ['PK', 'PK', 'PK', 'RD'],     // Tube 2
  ['LG', 'PU', 'LG', 'LB'],     // Tube 3
  ['GY', 'OR', 'LB', 'DB'],     // Tube 4
  ['DB', 'PU', 'LB', 'GY'],     // Tube 5
  ['PK', 'DG', 'LB', 'DB'],     // Tube 6
  ['LG', 'PU', 'RD', 'OR'],     // Tube 7
  ['DG', 'GY', 'DG', 'RD'],     // Tube 8
  ['DG', 'OR', 'DB', 'RD'],     // Tube 9
  [],                           // Tube 10
  []                            // Tube 11
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

const BallSortVisualizer = () => {
  const [solving, setSolving] = useState(false);
  const [solution, setSolution] = useState(null);
  const [validation, setValidation] = useState(null);

  const handleSolve = async () => {
    setSolving(true);
    setSolution(null);
    
    // Validate first
    const validationResult = validatePuzzle(initialPuzzleState.tubes, initialPuzzleState.maxBalls);
    setValidation(validationResult);
    
    if (!validationResult.valid) {
      setSolving(false);
      return;
    }

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const result = solvePuzzleBFS(
        initialPuzzleState.tubes.map(t => [...t]), 
        initialPuzzleState.maxBalls
      );
      setSolution(result);
      setSolving(false);
    }, 100);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Ball Sort Puzzle Solver</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Display current state */}
          <div className="grid grid-cols-6 gap-4 justify-center">
            {initialPuzzleState.tubes.map((tube, tubeIndex) => (
              <div key={tubeIndex} className="flex flex-col items-center space-y-1 border rounded p-2 w-16">
                {/* Empty spaces at top */}
                {Array(initialPuzzleState.maxBalls - tube.length).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} className="w-8 h-8 border rounded-full" />
                ))}
                {/* Balls from top to bottom */}
                {tube.map((ball, ballIndex) => (
                  <div
                    key={ballIndex}
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: COLORS[ball].hex }}
                  />
                ))}
                {/* Tube number */}
                <div className="text-sm mt-2">{tubeIndex + 1}</div>
              </div>
            ))}
          </div>

          {/* Solve button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleSolve} 
              disabled={solving}
              className="w-32"
            >
              {solving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Solving...
                </>
              ) : 'Solve Puzzle'}
            </Button>
          </div>

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
    </Card>
  );
};

export default BallSortVisualizer;