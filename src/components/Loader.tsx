import { cn } from '@/lib/utils';

const Loader = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        'absolute inset-0 flex justify-center items-center',
        className
      )}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-plank-pink border-t-transparent" />
    </div>
  );
};

export default Loader;
