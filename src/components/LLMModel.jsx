import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Boxes, Cpu, Network, Lightbulb, ArrowRight } from 'lucide-react'
//import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const EMOJI_SETS = {
  fruits: ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🍍', '🥝', '🍐', '🍑', '🍒', '🥭', '🫐', '🍋', '🍈', '🍏'],
  vehicles: ['🚗', '🚌', '🚲', '🏍️', '🚁', '🚂', '🚢', '🛩️', '🚜', '🚓', '🚑', '🚒', '🛵', '🚠', '🛶', '🛸'],
  animals: ['🐶', '🐱', '🐵', '🦁', '🐘', '🦒', '🐧', '🦋', '🐸', '🦜', '🐬', '🦘', '🦥', '🦊', '🐼', '🦖'],
  weather: ['☀️', '☁️', '🌧️', '❄️', '🌈', '⚡', '🌪️', '🌊', '🌁', '🌀', '🌤️', '🌥️', '🌦️', '🌨️', '🌩️', '🌫️'],
  sports: ['⚽', '🏀', '🎾', '🏈', '⚾', '🏐', '🏓', '🏸', '🥊', '🏊', '🏄', '🚴', '⛷️', '🏋️', '🤸', '🤺'],
  food: ['🍕', '🍔', '🌭', '🍟', '🌮', '🍣', '🍜', '🍝', '🍳', '🥐', '🥨', '🥞', '🧇', '🥯', '🥪', '🌯'],
  faces: ['😀', '😂', '🥳', '😎', '🤔', '😍', '😴', '🤯', '🥸', '🤠', '🤡', '👻', '👽', '🤖', '💩', '🎃'],
  plants: ['🌻', '🌼', '🌸', '🌺', '🌷', '🌹', '🍀', '🍁', '🍂', '🍃', '🌵', '🌴', '🌲', '🌳', '🍄', '🌱'],
  objects: ['📱', '💻', '⌚', '📷', '🔋', '💡', '🔨', '🧲', '🔭', '🔬', '📚', '✏️', '🖍️', '🧷', '🧵', '🧶'],
  flags: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇺🇳', '🇦🇺', '🇨🇦', '🇯🇵', '🇰🇷', '🇬🇧', '🇺🇸', '🇪🇺'],
  music: ['🎵', '🎶', '🎼', '🎹', '🥁', '🎸', '🎻', '🎺', '🎷', '🪕', '🪗', '🎤', '🎧', '📻', '🔉', '🔊'],
  space: ['🌙', '🌍', '🪐', '🌟', '⭐', '💫', '☄️', '🌠', '🌌', '🚀', '🛸', '🔭', '🌑', '🌕']
};

const DIFFICULTIES = {
  easy: { gridSize: 4, numRemove: [4, 6] },
  medium: { gridSize: 6, numRemove: [15, 20] },
  hard: { gridSize: 9, numRemove: [45, 55] }
};

// Grid-specific logic
const gridLogic = {
  4: {
    boxSize: 2,
    isValidMove: (board, row, col, emoji) => {
      // Check row and column
      for (let i = 0; i < 4; i++) {
        if (board[row][i] === emoji || board[i][col] === emoji) return false;
      }
      // Check 2x2 box
      const boxRow = Math.floor(row / 2) * 2;
      const boxCol = Math.floor(col / 2) * 2;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          if (board[boxRow + i][boxCol + j] === emoji) return false;
        }
      }
      return true;
    },
    getCellClassName: (rowIndex, colIndex, board, feedbackCell, completedSections) => {
      const isBoxBorder = rowIndex === 1;
      const isBoxRightBorder = colIndex === 1;
      return getCellClassNameHelper(rowIndex, colIndex, board, feedbackCell, completedSections, isBoxBorder, isBoxRightBorder, 2);
    }
  },
  6: {
    boxSize: 2,
    isValidMove: (board, row, col, emoji) => {
      // Check row and column
      for (let i = 0; i < 6; i++) {
        if (board[row][i] === emoji || board[i][col] === emoji) return false;
      }
      // Check 2x3 box
      const boxRow = Math.floor(row / 2) * 2;
      const boxCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[boxRow + i][boxCol + j] === emoji) return false;
        }
      }
      return true;
    },
    getCellClassName: (rowIndex, colIndex, board, feedbackCell, completedSections) => {
      const isBoxBorder = rowIndex === 1 || rowIndex === 3;
      const isBoxRightBorder = colIndex === 2;
      return getCellClassNameHelper(rowIndex, colIndex, board, feedbackCell, completedSections, isBoxBorder, isBoxRightBorder, 2);
    }
  },
  9: {
    boxSize: 3,
    isValidMove: (board, row, col, emoji) => {
      // Check row and column
      for (let i = 0; i < 9; i++) {
        if (board[row][i] === emoji || board[i][col] === emoji) return false;
      }
      // Check 3x3 box
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[boxRow + i][boxCol + j] === emoji) return false;
        }
      }
      return true;
    },
    getCellClassName: (rowIndex, colIndex, board, feedbackCell, completedSections) => {
      const isBoxBorder = rowIndex === 2 || rowIndex === 5;
      const isBoxRightBorder = colIndex === 2 || colIndex === 5;
      return getCellClassNameHelper(rowIndex, colIndex, board, feedbackCell, completedSections, isBoxBorder, isBoxRightBorder, 3);
    }
  }
};

const getCellClassNameHelper = (rowIndex, colIndex, board, feedbackCell, completedSections, isBoxBorder, isBoxRightBorder, boxSize) => {
  return `w-12 h-12 flex items-center justify-center text-2xl 
          border border-green-300 cursor-pointer
          ${isBoxBorder ? 'border-b-2 border-b-green-600' : ''}
          ${isBoxRightBorder ? 'border-r-2 border-r-green-600' : ''}
          ${board[rowIndex][colIndex] === null ? 'hover:bg-yellow-200' : ''}
          ${feedbackCell && feedbackCell.row === rowIndex && feedbackCell.col === colIndex
            ? (feedbackCell.correct ? 'bg-green-300' : 'bg-red-300')
            : ''}
          ${completedSections.some(
            section => 
              (section.type === 'row' && section.index === rowIndex) ||
              (section.type === 'col' && section.index === colIndex) ||
              (section.type === 'box' && 
               rowIndex >= section.row && rowIndex < section.row + boxSize &&
               colIndex >= section.col && colIndex < section.col + boxSize)
          ) ? 'bg-yellow-100' : ''}`;
};

const EmojiSudoku = () => {
  const [board, setBoard] = useState([]);
  const [solution, setSolution] = useState([]);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentEmojis, setCurrentEmojis] = useState([]);
  const [currentTheme, setCurrentTheme] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [gridSize, setGridSize] = useState(DIFFICULTIES.easy.gridSize);
  const [feedbackCell, setFeedbackCell] = useState(null);
  const [completedSections, setCompletedSections] = useState([]);

  useEffect(() => {
    generateNewPuzzle();
  }, []);

  const generateNewPuzzle = () => {
    const newTheme = selectRandomTheme();
    setCurrentTheme(newTheme);
    const newGridSize = DIFFICULTIES[difficulty].gridSize;
    setGridSize(newGridSize);
    const newEmojis = selectRandomEmojis(EMOJI_SETS[newTheme], newGridSize);
    setCurrentEmojis(newEmojis);
    const newSolution = generateRandomSolution(newEmojis, newGridSize);
    const newPuzzle = removeEmojisBalanced(newSolution, DIFFICULTIES[difficulty].numRemove, newGridSize);
    setBoard(newPuzzle);
    setSolution(newSolution);
    setIsComplete(false);
    setSelectedEmoji(null);
    setFeedbackCell(null);
    setCompletedSections([]);
  };

  const selectRandomTheme = () => {
    const themes = Object.keys(EMOJI_SETS);
    return themes[Math.floor(Math.random() * themes.length)];
  };

  const selectRandomEmojis = (emojiSet, size) => {
    const shuffled = [...emojiSet].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  };

  const generateRandomSolution = (emojis, size) => {
    const board = Array(size).fill().map(() => Array(size).fill(null));
    fillBoard(board, emojis, size);
    return board;
  };

  const fillBoard = (board, emojis, size) => {
    const fillCell = (row, col) => {
      if (col === size) {
        col = 0;
        row++;
        if (row === size) return true; // Board is filled
      }

      if (board[row][col] !== null) return fillCell(row, col + 1);

      const shuffledEmojis = [...emojis].sort(() => 0.5 - Math.random());

      for (let emoji of shuffledEmojis) {
        if (gridLogic[size].isValidMove(board, row, col, emoji)) {
          board[row][col] = emoji;
          if (fillCell(row, col + 1)) return true;
          board[row][col] = null; // Backtrack
        }
      }

      return false;
    };

    fillCell(0, 0);
    return board;
  };

  const removeEmojisBalanced = (solvedPuzzle, [minRemove, maxRemove], size) => {
    const puzzle = JSON.parse(JSON.stringify(solvedPuzzle));
    const numToRemove = minRemove + Math.floor(Math.random() * (maxRemove - minRemove + 1));
    
    const positions = Array(size * size).fill().map((_, index) => [Math.floor(index / size), index % size]);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < numToRemove && i < positions.length; i++) {
      const [row, col] = positions[i];
      puzzle[row][col] = null;
    }

    return puzzle;
  };

  const handleCellClick = (row, col) => {
    if (selectedEmoji && board[row][col] === null) {
      if (selectedEmoji === solution[row][col]) {
        const newBoard = [...board];
        newBoard[row][col] = selectedEmoji;
        setBoard(newBoard);
        setSelectedEmoji(null);
        setFeedbackCell({ row, col, correct: true });
        setTimeout(() => setFeedbackCell(null), 500);

        const newCompletedSections = checkCompletedSections(newBoard, row, col);
        setCompletedSections(newCompletedSections);

        if (isBoardComplete(newBoard)) {
          setIsComplete(true);
        }
      } else {
        setFeedbackCell({ row, col, correct: false });
        setTimeout(() => setFeedbackCell(null), 500);
      }
    }
  };

  const checkCompletedSections = (board, row, col) => {
    const size = board.length;
    const newCompletedSections = [...completedSections];
    const { boxSize } = gridLogic[size];

    // Check row
    if (board[row].every(cell => cell !== null)) {
      newCompletedSections.push({ type: 'row', index: row });
    }

    // Check column
    if (board.every(r => r[col] !== null)) {
      newCompletedSections.push({ type: 'col', index: col });
    }

    // Check box
    const boxRow = Math.floor(row / boxSize) * boxSize;
    const boxCol = Math.floor(col / (size === 6 ? 3 : boxSize)) * (size === 6 ? 3 : boxSize);
    let boxComplete = true;
    for (let i = 0; i < boxSize; i++) {
      for (let j = 0; j < (size === 6 ? 3 : boxSize); j++) {
        if (board[boxRow + i][boxCol + j] === null) {
          boxComplete = false;
          break;
        }
      }
      if (!boxComplete) break;
    }
    if (boxComplete) {
      newCompletedSections.push({ type: 'box', row: boxRow, col: boxCol });
    }

    return newCompletedSections;
  };

  const isBoardComplete = (board) => {
    return board.every(row => row.every(cell => cell !== null));
  };

  return (
    <div className="flex flex-col items-center p-4 bg-yellow-100 rounded-lg">
      <h2 className="text-2xl mb-4 font-bold text-green-600">Emoji Sudoku: {currentTheme}</h2>
      <div className={`grid grid-cols-${gridSize} gap-0 mb-4 p-2 bg-white rounded-lg shadow-md`}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={gridLogic[gridSize].getCellClassName(rowIndex, colIndex, board, feedbackCell, completedSections)}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            >
              {cell}
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap justify-center space-x-2 mb-4">
        {currentEmojis.map(emoji => (
          <Button
            key={emoji}
            onClick={() => setSelectedEmoji(emoji)}
            className={`w-10 h-10 text-xl ${selectedEmoji === emoji ? 'bg-yellow-300' : 'bg-white'}`}
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="flex items-center space-x-4 mb-2">
        <Select onValueChange={(value) => {
          setDifficulty(value);
          generateNewPuzzle();
        }} defaultValue={difficulty}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy (4x4)</SelectItem>
            <SelectItem value="medium">Medium (6x6)</SelectItem>
            <SelectItem value="hard">Hard (9x9)</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={generateNewPuzzle} className="bg-green-500 text-white">New Puzzle</Button>
      </div>
      {isComplete && (
        <div className="mt-4 text-xl font-bold text-green-600 animate-bounce">
          Congratulations! You solved the puzzle! 🎉
        </div>
      )}
    </div>
  );
};

export default EmojiSudoku;