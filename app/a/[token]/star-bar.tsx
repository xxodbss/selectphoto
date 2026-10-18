"use client";

type Props = {
  value: number;
  disabled: boolean;
  onRate: (stars: number) => void;
};

// 별 5개: 누르면 그 점수, 같은 별을 다시 누르면 취소
// 안 고른 칸은 ∗, 고른 칸은 회색 별이 찬다
export function StarBar({ value, disabled, onRate }: Props) {
  return (
    <div className="flex flex-none justify-center" role="radiogroup" aria-label="별점">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}점`}
          disabled={disabled}
          onClick={() => onRate(n)}
          className={`flex h-10 w-9 items-center justify-center text-xl leading-none disabled:opacity-60 ${
            n <= value ? "text-zinc-300" : "text-zinc-500"
          }`}
        >
          {n <= value ? "★" : "∗"}
        </button>
      ))}
    </div>
  );
}
