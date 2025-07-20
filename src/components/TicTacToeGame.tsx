import { useState, useCallback, useEffect } from 'react';
import { useHandGestures } from '@/hooks/useHandGestures';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type Player = 'X' | 'O' | null;
type GameBoard = Player[];

const TicTacToeGame = () => {
  const [board, setBoard] = useState<GameBoard>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<'X' | 'O' | 'tie' | null>(null);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [lastGestureTime, setLastGestureTime] = useState(0);
  
  const { videoRef, canvasRef, gesture, isInitialized, error } = useHandGestures();

  const checkWinner = useCallback((newBoard: GameBoard): { winner: 'X' | 'O' | 'tie' | null; winningCells: number[] } => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        return { winner: newBoard[a] as 'X' | 'O', winningCells: pattern };
      }
    }

    if (newBoard.every(cell => cell !== null)) {
      return { winner: 'tie', winningCells: [] };
    }

    return { winner: null, winningCells: [] };
  }, []);

  const makeMove = useCallback((index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result.winner) {
      setWinner(result.winner);
      setWinningCells(result.winningCells);
      if (result.winner === 'tie') {
        toast("It's a tie! 🤝");
      } else {
        toast(`Player ${result.winner} wins! 🎉`);
      }
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  }, [board, currentPlayer, winner, checkWinner]);

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setWinningCells([]);
    toast("New game started! 🎮");
  }, []);

  // Convert hand position to board cell
  const getPointedCell = useCallback((position: { x: number; y: number }) => {
    // Assuming the game board takes up a specific area of the screen
    // We need to map the hand position to the 3x3 grid
    const col = Math.floor(position.x * 3);
    const row = Math.floor(position.y * 3);
    
    // Ensure we're within bounds
    if (row >= 0 && row < 3 && col >= 0 && col < 3) {
      return row * 3 + col;
    }
    return null;
  }, []);

  // Handle gesture detection
  useEffect(() => {
    if (!gesture.pointing || !gesture.pointingPosition) return;

    const now = Date.now();
    const cooldownPeriod = 1000; // 1 second cooldown

    if (now - lastGestureTime < cooldownPeriod) return;

    const pointedCell = getPointedCell(gesture.pointingPosition);
    if (pointedCell !== null) {
      makeMove(pointedCell);
      setLastGestureTime(now);
    }
  }, [gesture, getPointedCell, makeMove, lastGestureTime]);

  const renderCell = (index: number) => {
    const value = board[index];
    const isWinning = winningCells.includes(index);
    
    return (
      <div
        key={index}
        className={`game-cell h-24 flex items-center justify-center text-4xl font-bold ${
          isWinning ? 'winner' : ''
        }`}
        onClick={() => makeMove(index)}
      >
        {value && (
          <span className={value === 'X' ? 'player-x' : 'player-o'}>
            {value}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Hand Gesture Tic-Tac-Toe
          </h1>
          <p className="text-muted-foreground">Point at a cell to make your move!</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Game Board */}
          <Card className="p-6">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-lg">
                  Current Player: 
                  <span className={currentPlayer === 'X' ? 'player-x font-bold' : 'player-o font-bold'}>
                    {' '}{currentPlayer}
                  </span>
                </span>
                <Button onClick={resetGame} variant="outline">
                  New Game
                </Button>
              </div>
              
              {winner && (
                <div className="text-xl font-bold mb-4">
                  {winner === 'tie' ? "It's a tie!" : `Player ${winner} wins!`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
              {Array(9).fill(null).map((_, index) => renderCell(index))}
            </div>
          </Card>

          {/* Camera Feed */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Hand Tracking</h3>
            
            {error && (
              <div className="text-destructive mb-4">
                {error}
              </div>
            )}
            
            <div className="relative">
              <video
                ref={videoRef}
                className="camera-preview w-full"
                style={{ display: isInitialized ? 'block' : 'none' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                width={640}
                height={480}
                style={{ display: isInitialized ? 'block' : 'none' }}
              />
              
              {!isInitialized && !error && (
                <div className="camera-preview w-full h-64 flex items-center justify-center bg-muted">
                  <p>Initializing camera...</p>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <span className={`gesture-indicator ${
                  gesture.gesture === 'pointing' ? 'bg-primary text-primary-foreground' : ''
                }`}>
                  {gesture.gesture || 'No gesture detected'}
                </span>
              </div>
              
              {gesture.pointing && (
                <p className="text-sm text-muted-foreground">
                  👉 Pointing detected! Position: ({gesture.pointingPosition?.x.toFixed(2)}, {gesture.pointingPosition?.y.toFixed(2)})
                </p>
              )}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <p><strong>How to play:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Point your index finger at a cell to select it</li>
                <li>Keep other fingers folded for best detection</li>
                <li>Wait 1 second between moves</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicTacToeGame;