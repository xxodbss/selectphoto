export default function AlbumNotFound() {
  return (
    <main className="dark bridge-page mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16 text-center text-zinc-100">
      <p className="text-sm font-bold tracking-tight text-zinc-400">epilego</p>
      <h1 className="text-xl font-bold">앨범을 찾을 수 없어요</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        링크가 맞는지 확인해 주세요. 계속 안 열리면 작가님께 링크를 다시 받아 주세요.
      </p>
    </main>
  );
}
