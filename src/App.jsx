import React, { useState, useEffect, useRef} from 'react';
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

const initialTubes = [
  ['DB', 'RD', 'DG', 'DG', 'PK', 'PK'],     // Tube 1
  ['DG', 'GY', 'LB', 'DB', 'OR', 'DB'],     // Tube 2
  ['PK', 'DG', 'LB', 'RD', 'PU', 'GY'],     // Tube 3
  ['LG', 'PK', 'OR', 'LG', 'DB', 'LB'],     // Tube 4
  ['DG', 'LB', 'RD', 'RD', 'RD', 'PU'],     // Tube 5
  ['GY', 'PU', 'GY', 'LG', 'PU', 'LB'],     // Tube 6
  ['LB', 'LG', 'OR', 'DG', 'GY', 'PK'],     // Tube 7
  ['PU', 'PK', 'GY', 'LG', 'OR', 'OR'],     // Tube 8
  ['PU', 'LG', 'DB', 'DB', 'OR', 'RD'],     // Tube 9
  [],                                        // Tube 10
  []                                         // Tube 11
];

const BallSortGame = () => {
  // Game state
  const [tubes, setTubes] = useState(initialTubes);
  const [moveCount, setMoveCount] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [solving, setSolving] = useState(false);
  const [solution, setSolution] = useState(null);
  const [dragState, setDragState] = useState({
    dragging: false,
    sourceIndex: null,
    invalidMove: false
  });
  const [isComplete, setIsComplete] = useState(false);

  // Check if a tube is complete (all same color)
  const isTubeComplete = (tube) => {
    if (tube.length !== 6) return false;
    const firstBall = tube[0];
    return tube.every(ball => ball === firstBall);
  };

  // Check if puzzle is complete
  const checkPuzzleComplete = (tubesState) => {
    const complete = tubesState.every(tube => 
      tube.length === 0 || isTubeComplete(tube)
    );
    if (complete && !isComplete) {
      setIsComplete(true);
      // Trigger completion celebration
      import('canvas-confetti').then(confetti => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      });
    }
    return complete;
  };

  // Refs for drag and drop
  const tubeRefs = useRef([]);

  // Validate move
  const isValidMove = (fromTube, toTube) => {
    if (fromTube === toTube) return false;
    if (tubes[fromTube].length === 0) return false;
    if (tubes[toTube].length >= 6) return false;
    
    const ballToMove = tubes[fromTube][0];
    return tubes[toTube].length === 0 || tubes[toTube][0] === ballToMove;
  };

  // Handle moves
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
    setMoveCount(moveCount + 1);
    setMoveHistory([...moveHistory, { from: fromTube, to: toTube, ball }]);
    setRedoStack([]);

    // Check for completion after move
    checkPuzzleComplete(newTubes);
    return true;
  };

  // Undo last move
  const undo = () => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const newTubes = [...tubes];
    const ball = newTubes[lastMove.to][0];
    newTubes[lastMove.to] = newTubes[lastMove.to].slice(1);
    newTubes[lastMove.from] = [ball, ...newTubes[lastMove.from]];
    
    setTubes(newTubes);
    setMoveCount(moveCount - 1);
    setMoveHistory(moveHistory.slice(0, -1));
    setRedoStack([...redoStack, lastMove]);
  };

  // Redo last undone move
  const redo = () => {
    if (redoStack.length === 0) return;
    
    const move = redoStack[redoStack.length - 1];
    makeMove(move.from, move.to);
    setRedoStack(redoStack.slice(0, -1));
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

    // Set drag image
    const ball = tubes[tubeIndex][0];
    const dragImage = document.createElement('div');
    dragImage.className = 'w-6 h-6 rounded-full';
    dragImage.style.backgroundColor = COLORS[ball].hex;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 10, 10);
    setTimeout(() => document.body.removeChild(dragImage), 0);
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

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Ball Sort Puzzle</span>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-normal">Moves: {moveCount}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={undo}
              disabled={moveHistory.length === 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={redo}
              disabled={redoStack.length === 0}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Completion message */}
          {isComplete && (
            <div className="bg-green-100 p-4 rounded-lg text-center animate-fade-in">
              <h3 className="text-xl font-bold text-green-800 mb-2">
                🎉 Puzzle Complete! 🎉
              </h3>
              <p className="text-green-700">
                Congratulations! You solved the puzzle in {moveCount} moves!
              </p>
            </div>
          )}

          {/* Game grid */}
          <div className="flex justify-center">
            <div className="grid grid-cols-6 gap-4 max-w-3xl">
              {tubes.map((tube, tubeIndex) => (
                <div 
                  key={tubeIndex} 
                  className="flex flex-col items-center"
                  ref={el => tubeRefs.current[tubeIndex] = el}
                >
                  <div 
                    className={`flex flex-col space-y-1 border rounded p-2 mb-1 transition-all duration-200
                      ${dragState.dragging && isValidMove(dragState.sourceIndex, tubeIndex) ? 'border-green-500' : ''}
                      ${dragState.invalidMove && dragState.sourceIndex === tubeIndex ? 'shake' : ''}
                      ${isTubeComplete(tube) ? 'border-green-500 shadow-lg shadow-green-200 bg-green-50' : ''}`}
                    onDragOver={(e) => handleDragOver(e, tubeIndex)}
                    onDrop={(e) => handleDrop(e, tubeIndex)}
                  >
                    {/* Completion checkmark */}
                    {isTubeComplete(tube) && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                    {/* Empty spaces */}
                    {Array(6 - tube.length).fill(null).map((_, i) => (
                      <div key={`empty-${i}`} className="w-6 h-6 border rounded-full" />
                    ))}
                    {/* Balls */}
                    {tube.map((ball, ballIndex) => (
                      <div
                        key={ballIndex}
                        className={`w-6 h-6 rounded-full ${ballIndex === 0 ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
          </div>

          {/* Solve button */}
          <div className="flex justify-center">
            <Button 
              onClick={() => {/* Solver implementation */}} 
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .relative {
          position: relative;
        }
      `}</style>
    </Card>
  );
};

export default BallSortGame;