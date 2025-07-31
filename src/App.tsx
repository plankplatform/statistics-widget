interface AppProps {
  statId: string;
  graphId: string;
}

export default function App({ statId, graphId }: AppProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white text-black p-4">
      <h1 className="text-3xl font-bold mb-4">Hello World</h1>
      <p className="text-lg">Stat ID: {statId || 'N/A'}</p>
      <p className="text-lg">Graph ID: {graphId || 'N/A'}</p>
    </div>
  );
}
