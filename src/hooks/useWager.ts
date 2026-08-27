import { useWallet, GameType } from "../context/WalletContext";

export function useWager() {
  const { balance, setBalance, addTransaction } = useWallet();

  const placeWager = (amount: number): boolean => {
    if (balance < amount || amount <= 0) return false;
    setBalance((prev) => prev - amount);
    return true;
  };

  const resolveWager = (
    amount: number,
    payout: number,
    isWin: boolean,
    type: GameType,
    description: string
  ) => {
    if (isWin && payout > 0) {
      setBalance((prev) => prev + payout);
    }
    
    addTransaction(
      type,
      description,
      amount,
      isWin ? "win" : "lose",
      payout
    );
  };

  return {
    balance,
    placeWager,
    resolveWager,
    addTransaction
  };
}

export default useWager;
